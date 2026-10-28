import { fail } from '@sveltejs/kit';
import { exigir } from '#lib/server/auth';
import { executar, todos, um } from '#lib/server/db';
import { inteiro, texto } from '#lib/server/form';
import { disponibilidadesPorUsuario } from '#lib/server/obreiros';
import { podeGerirArea, type Usuario } from '#lib/util';
export const load = async ({ locals }) => {
    const area = locals.area!;
    exigir(podeGerirArea(locals.user, area.id));
    const disponibilidades = (await disponibilidadesPorUsuario());
    const cadastros = (await todos<{
        id: number;
        nome: string;
        carteira: string;
        cargo: string;
        whatsapp: string;
        criado_em: string;
        congregacao: string;
        cadastrado_por_nome: string | null;
    }>(`SELECT u.id, u.nome, u.carteira, u.cargo, u.whatsapp, u.criado_em, g.nome AS congregacao, c.nome AS cadastrado_por_nome
		 FROM usuarios u
		 JOIN congregacoes g ON g.id = u.congregacao_id
		 LEFT JOIN usuarios c ON c.id = u.cadastrado_por
		 WHERE u.status = 'pendente' AND g.area_id = ?
		 ORDER BY u.criado_em`, area.id)).map((u) => ({ ...u, disponibilidade: disponibilidades.get(u.id) ?? [] }));
    const indicacoes = (await todos<{
        id: number;
        data: string;
        hora_inicio: string;
        hora_fim: string;
        tipo: string;
        congregacao: string;
        ponto: string | null;
        nome: string;
        cargo: string;
        indicado_por_nome: string;
    }>(`SELECT e.id, c.data, c.hora_inicio, c.hora_fim, t.nome AS tipo, g.nome AS congregacao, p.nome AS ponto,
		        u.nome, u.cargo, i.nome AS indicado_por_nome
		 FROM escalas e
		 JOIN cultos c ON c.id = e.culto_id
		 JOIN tipos_culto t ON t.id = c.tipo_culto_id
		 JOIN congregacoes g ON g.id = c.congregacao_id
		 LEFT JOIN pontos_pregacao p ON p.id = c.ponto_id
		 JOIN usuarios u ON u.id = e.usuario_id
		 JOIN usuarios i ON i.id = e.indicado_por
		 WHERE e.autorizacao = 'aguardando' AND g.area_id = ?
		 ORDER BY c.data, c.hora_inicio`, area.id));
    return { cadastros, indicacoes };
};
/** Confere se o cadastro pendente é de uma área que o usuário coordena. */
async function exigirCadastroDaArea(u: Usuario | null, usuarioId: number) {
    const alvo = (await um<{
        area_id: number;
    }>('SELECT g.area_id FROM usuarios u JOIN congregacoes g ON g.id = u.congregacao_id WHERE u.id = ?', usuarioId));
    exigir(!!alvo && podeGerirArea(u, alvo.area_id));
}
async function exigirIndicacaoDaArea(u: Usuario | null, escalaId: number) {
    const alvo = (await um<{
        area_id: number;
    }>(`SELECT g.area_id FROM escalas e JOIN cultos c ON c.id = e.culto_id JOIN congregacoes g ON g.id = c.congregacao_id
		 WHERE e.id = ?`, escalaId));
    exigir(!!alvo && podeGerirArea(u, alvo.area_id));
}
export const actions = {
    aprovarCadastro: async ({ request, locals }) => {
        const id = inteiro(await request.formData(), 'id');
        (await exigirCadastroDaArea(locals.user, id));
        (await executar(`UPDATE usuarios SET status = 'ativo', motivo_recusa = NULL, aprovado_por = ?, aprovado_em = datetime('now', 'localtime')
			 WHERE id = ? AND status = 'pendente'`, locals.user!.id, id));
        return { ok: 'Cadastro aprovado. O obreiro já pode entrar com o Nº da carteira e a senha.' };
    },
    recusarCadastro: async ({ request, locals }) => {
        const f = await request.formData();
        const id = inteiro(f, 'id');
        (await exigirCadastroDaArea(locals.user, id));
        const motivo = texto(f, 'motivo');
        if (!motivo)
            return fail(400, { erro: 'Informe o motivo da recusa.' });
        (await executar(`UPDATE usuarios SET status = 'recusado', motivo_recusa = ? WHERE id = ? AND status = 'pendente'`, motivo, id));
        return { ok: 'Cadastro recusado.' };
    },
    autorizarIndicacao: async ({ request, locals }) => {
        const id = inteiro(await request.formData(), 'id');
        (await exigirIndicacaoDaArea(locals.user, id));
        (await executar(`UPDATE escalas SET autorizacao = 'autorizada', autorizado_por = ? WHERE id = ? AND autorizacao = 'aguardando'`, locals.user!.id, id));
        return { ok: 'Indicação autorizada. O obreiro já aparece na escala.' };
    },
    recusarIndicacao: async ({ request, locals }) => {
        const id = inteiro(await request.formData(), 'id');
        (await exigirIndicacaoDaArea(locals.user, id));
        (await executar(`DELETE FROM escalas WHERE id = ? AND autorizacao = 'aguardando'`, id));
        return { ok: 'Indicação recusada.' };
    }
};
