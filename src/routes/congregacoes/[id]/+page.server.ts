import { error, fail } from '@sveltejs/kit';
import { exigir } from '#lib/server/auth';
import { regerarCultosFuturos } from '#lib/server/cultos';
import { executar, todos, um } from '#lib/server/db';
import { hora, inteiro, marcado, texto } from '#lib/server/form';
import { igrejaRestrita, podeGerirArea, podeGerirCongregacao, type Usuario } from '#lib/util';
const buscarCongregacao = async (id: number) => (await um<{
    id: number;
    area_id: number;
}>('SELECT id, area_id FROM congregacoes WHERE id = ? AND habilitada=1', id));
/** Templo: só a coordenação da área. Pontos de pregação: coordenação ou Pb da congregação. */
async function exigirGestao(u: Usuario | null, id: number, alvo: 'templo' | 'ponto') {
    const c = (await buscarCongregacao(id));
    exigir(!!c && podeGerirCongregacao(u, c), alvo === 'ponto'
        ? 'Somente a coordenação da área e o Pb da congregação cuidam dos pontos de pregação.'
        : 'Somente a coordenação da área altera a agenda e os dados da congregação.');
}
export const load = async ({ params, locals }) => {
    const id = Number(params.id);
    const igreja = igrejaRestrita(locals.user);
    exigir(!igreja || igreja === id, 'O Pb tem acesso apenas à própria igreja.');
    const congregacao = (await um<{
        id: number;
        area_id: number;
        area: string;
        codigo: string;
        nome: string;
        endereco: string;
        maps: string;
        sede: number;
    }>('SELECT g.*, a.codigo AS area FROM congregacoes g JOIN areas a ON a.id = g.area_id WHERE g.id = ? AND g.habilitada=1', id));
    if (!congregacao)
        error(404, 'Congregação não encontrada.');
    exigir(congregacao.area_id===locals.area!.id || podeGerirArea(locals.user,congregacao.area_id),'Esta congregação pertence a outra área.');
    return {
        congregacao,
        regras: (await todos<{
            id: number;
            ponto_id: number | null;
            tipo: string;
            dia_semana: number;
            semana_mes: number | null;
            hora_inicio: string;
            hora_fim: string;
        }>(`SELECT a.id, a.ponto_id, t.nome AS tipo, a.dia_semana, a.semana_mes, a.hora_inicio, a.hora_fim
			 FROM agenda a JOIN tipos_culto t ON t.id = a.tipo_culto_id
			 WHERE a.congregacao_id = ?
			 ORDER BY (a.dia_semana + 6) % 7, a.semana_mes IS NOT NULL, a.semana_mes, a.hora_inicio`, id)),
        pontos: (await todos<{
            id: number;
            nome: string;
            endereco: string;
            maps: string;
            ativo: number;
        }>('SELECT id, nome, endereco, maps, ativo FROM pontos_pregacao WHERE congregacao_id = ? ORDER BY ativo DESC, nome', id)),
        tipos: (await todos<{
            id: number;
            nome: string;
        }>('SELECT id, nome FROM tipos_culto WHERE ativo = 1 ORDER BY nome')),
        podeGerir: podeGerirCongregacao(locals.user, congregacao),
        admin: podeGerirArea(locals.user, congregacao.area_id)
    };
};
/** Lê os campos de uma regra da agenda (tipo, dia, semana do mês, horário). */
async function lerRegra(f: FormData) {
    const tipo = (await um<{
        id: number;
        hora_inicio: string;
        hora_fim: string;
    }>('SELECT id, hora_inicio, hora_fim FROM tipos_culto WHERE id = ?', inteiro(f, 'tipo_culto_id')));
    const dia = Number(texto(f, 'dia_semana'));
    const semana = inteiro(f, 'semana_mes');
    if (!tipo || !Number.isInteger(dia) || dia < 0 || dia > 6 || texto(f, 'dia_semana') === '') {
        return { regra: undefined, erro: 'Selecione o tipo de culto e o dia da semana.' };
    }
    const inicio = hora(f, 'hora_inicio') || tipo.hora_inicio;
    const fim = hora(f, 'hora_fim') || tipo.hora_fim;
    if (fim <= inicio)
        return { regra: undefined, erro: 'O horário de término deve ser depois do início.' };
    const regra = { tipo: tipo.id, dia, semana: semana >= 1 && semana <= 5 ? semana : null, inicio, fim };
    return { regra, erro: undefined };
}
export const actions = {
    salvarCongregacao: async ({ request, params, locals }) => {
        (await exigirGestao(locals.user, Number(params.id), 'templo'));
        const f = await request.formData();
        const nome = texto(f, 'nome');
        if (!nome)
            return fail(400, { erro: 'Informe o nome da congregação.' });
        (await executar('UPDATE congregacoes SET nome = ?, endereco = ?, maps = ? WHERE id = ?', nome, texto(f, 'endereco'), texto(f, 'maps'), Number(params.id)));
        return { ok: 'Dados da congregação atualizados.' };
    },
    novaRegra: async ({ request, params, locals }) => {
        const id = Number(params.id);
        const f = await request.formData();
        const pontoId = inteiro(f, 'ponto_id');
        (await exigirGestao(locals.user, id, pontoId ? 'ponto' : 'templo'));
        if (pontoId && !(await um('SELECT id FROM pontos_pregacao WHERE id = ? AND congregacao_id = ?', pontoId, id))) {
            return fail(400, { erro: 'Ponto de pregação inválido.' });
        }
        const { regra, erro } = (await lerRegra(f));
        if (!regra)
            return fail(400, { erro });
        (await executar(`INSERT INTO agenda (congregacao_id, ponto_id, tipo_culto_id, dia_semana, semana_mes, hora_inicio, hora_fim) VALUES (?, ?, ?, ?, ?, ?, ?)`, id, pontoId || null, regra.tipo, regra.dia, regra.semana, regra.inicio, regra.fim));
        (await regerarCultosFuturos(id));
        return { ok: 'Culto adicionado à agenda.' };
    },
    removerRegra: async ({ request, params, locals }) => {
        const id = Number(params.id);
        const f = await request.formData();
        const regra = (await um<{
            id: number;
            ponto_id: number | null;
        }>('SELECT id, ponto_id FROM agenda WHERE id = ? AND congregacao_id = ?', inteiro(f, 'id'), id));
        if (!regra)
            return fail(404, { erro: 'Culto da agenda não encontrado.' });
        (await exigirGestao(locals.user, id, regra.ponto_id ? 'ponto' : 'templo'));
        (await regerarCultosFuturos(id));
        (await executar('DELETE FROM agenda WHERE id = ?', regra.id));
        return { ok: 'Culto removido da agenda. Escalas já feitas foram mantidas.' };
    },
    novoPonto: async ({ request, params, locals }) => {
        const id = Number(params.id);
        (await exigirGestao(locals.user, id, 'ponto'));
        const f = await request.formData();
        const nome = texto(f, 'nome');
        if (!nome)
            return fail(400, { erro: 'Informe o nome do local. Ex.: Casa do Ir. João Clementino.' });
        const { regra, erro } = (await lerRegra(f));
        if (!regra)
            return fail(400, { erro });
        const { id: pontoId } = (await executar('INSERT INTO pontos_pregacao (congregacao_id, nome, endereco, maps, criado_por) VALUES (?, ?, ?, ?, ?)', id, nome, texto(f, 'endereco'), texto(f, 'maps'), locals.user!.id));
        (await executar(`INSERT INTO agenda (congregacao_id, ponto_id, tipo_culto_id, dia_semana, semana_mes, hora_inicio, hora_fim) VALUES (?, ?, ?, ?, ?, ?, ?)`, id, pontoId, regra.tipo, regra.dia, regra.semana, regra.inicio, regra.fim));
        (await regerarCultosFuturos(id));
        return { ok: 'Ponto de pregação cadastrado.' };
    },
    salvarPonto: async ({ request, params, locals }) => {
        const id = Number(params.id);
        (await exigirGestao(locals.user, id, 'ponto'));
        const f = await request.formData();
        const nome = texto(f, 'nome');
        if (!nome)
            return fail(400, { erro: 'Informe o nome do local.' });
        (await executar('UPDATE pontos_pregacao SET nome = ?, endereco = ?, maps = ?, ativo = ? WHERE id = ? AND congregacao_id = ?', nome, texto(f, 'endereco'), texto(f, 'maps'), marcado(f, 'ativo') ? 1 : 0, inteiro(f, 'id'), id));
        (await regerarCultosFuturos(id));
        return { ok: 'Ponto de pregação atualizado.' };
    }
};
