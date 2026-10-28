import {salvarEvento} from '#lib/server/eventos';
import { atribuir, servicoPorId, motivoInelegivel } from '#lib/server/elegibilidade';
import { auditar } from '#lib/server/auditoria';
import { fail } from '@sveltejs/kit';
import { cultosDoDia, escalasDoDia, garantirCultos, montarCandidatos } from '#lib/server/cultos';
import { executar, todos, um } from '#lib/server/db';
import { hora, inteiro, texto } from '#lib/server/form';
import { listarCongregacoes } from '#lib/server/obreiros';
import { avisoDoCargo, cargoPermitido, dataValida, ehAdmin, ehPb, igrejaRestrita, hojeISO, podeGerirArea, podeGerirCongregacao, podeMontarEscala, segundaDaSemana, somarDias, type Usuario } from '#lib/util';
export const load = async ({ url, locals }) => {
    const u = locals.user!;
    const area = locals.area!;
    const param = url.searchParams.get('data');
    const data = dataValida(param) ? param : hojeISO();
    // O Pb vê só a própria igreja; os demais escolhem a congregação (0 = todas da área).
    const igreja = u.gerencia_escala || !ehPb(u) ? null : u.congregacao_id;
    const filtro = igreja ?? (Number(url.searchParams.get('cong')) || 0);
    const admin = podeMontarEscala(u, area.id);
    (await garantirCultos(data, area.id));
    const escalas = (await escalasDoDia(data, area.id));
    const candidatosPara = admin ? (await montarCandidatos(data, area.id, igreja)) : null;
    const cultos = await Promise.all((await cultosDoDia(data, area.id)).filter((c) => !filtro || c.congregacao_id === filtro)
        .map(async (c) => {
        const gere = podeMontarEscala(u,c.area_id);
        // Indicações aguardando só aparecem para a coordenação e para o Pb da congregação.
        const visiveis = escalas.filter((e) => e.culto_id === c.id && (e.autorizacao === 'autorizada' || gere || e.usuario_id === u.id)).map(e=>({...e,whatsapp:gere?e.whatsapp:''}));
        const podeEscalar = !c.cancelado && !!candidatosPara && (gere);
        return {
            ...c,
            escalas: visiveis,
            podeEditar: podeMontarEscala(u,c.area_id),
            podeEscalar,
            avisoCargo: avisoDoCargo(c.tipo),
            candidatos: podeEscalar ? (await Promise.all(candidatosPara!(c).map(async candidato=>({...candidato,recomendado:!(await motivoInelegivel(candidato.id,c))})))).filter(c=>c.recomendado) : []
        };
    }));
    const segunda = segundaDaSemana(data);
    return {
        data,
        filtro,
        hoje: hojeISO(),
        semana: Array.from({ length: 7 }, (_, i) => somarDias(segunda, i)),
        cultos,
        admin,
        montaEscala: admin,
        congregacoes: (await listarCongregacoes(area.id)).filter((c) => !igreja || c.id === igreja),
        igrejaFixa: !!igreja,
        pontos: admin
            ? (await todos<{
                id: number;
                congregacao_id: number;
                nome: string;
            }>(`SELECT p.id, p.congregacao_id, p.nome FROM pontos_pregacao p JOIN congregacoes g ON g.id = p.congregacao_id
					 WHERE p.ativo = 1 AND g.area_id = ? ORDER BY p.nome`, area.id)) : [],
        tipos: admin
            ? (await todos<{
                id: number;
                nome: string;
            }>('SELECT id, nome FROM tipos_culto WHERE ativo = 1 ORDER BY nome')) : []
    };
};
interface CultoAlvo {
    id: number;
    data: string;
    ponto_id: number | null;
    tipo: string;
    congregacao_id: number;
    area_id: number;
    cancelado: number;
}
const buscarCulto = async (cultoId: number) => (await um<CultoAlvo>(`SELECT c.id, c.data, c.ponto_id, t.nome AS tipo, c.congregacao_id, g.area_id, c.cancelado
		 FROM cultos c JOIN congregacoes g ON g.id = c.congregacao_id JOIN tipos_culto t ON t.id = c.tipo_culto_id
		 WHERE c.id = ?`, cultoId));
async function cultoGerenciavel(u: Usuario, cultoId: number) {
    const culto = (await buscarCulto(cultoId));
    if (!culto)
        return { culto: undefined, erro: fail(404, { erro: 'Culto não encontrado.', cultoId }) };
    if (!(podeMontarEscala(u,culto.area_id))) {
        const mensagem = ehPb(u)
            ? 'Você só pode indicar obreiros para os cultos da sua congregação.'
            : 'Somente a coordenação da área e o Pb responsável pela congregação podem escalar.';
        const erro = fail(403, { erro: mensagem, cultoId });
        return { culto: undefined, erro };
    }
    return { culto, erro: undefined };
}
/** Escala com a área do culto, para conferir se a coordenação pode mexer nela. */
const buscarEscala = async (id: number) => (await um<{
    id: number;
    culto_id: number;
    area_id: number;
    congregacao_id: number;
    autorizacao: string;
    funcao: string;
    indicado_por: number;
}>(`SELECT e.id, e.culto_id, c.congregacao_id, g.area_id, e.autorizacao, e.funcao, e.indicado_por
		 FROM escalas e JOIN cultos c ON c.id = e.culto_id JOIN congregacoes g ON g.id = c.congregacao_id
		 WHERE e.id = ?`, id));
export const actions = {
    escalar: async ({ request, locals }) => {
        const u = locals.user!;
        const f = await request.formData();
        const cultoId = inteiro(f, 'culto_id');
        const r = (await cultoGerenciavel(u, cultoId));
        if (!r.culto)
            return r.erro;
        const culto = r.culto;
        if (culto.cancelado)
            return fail(400, { erro: 'Este culto está cancelado.', cultoId });
        const atual=await servicoPorId(cultoId);
        if(!atual) return fail(404,{erro:'Culto inexistente.'});
        const resultado=await atribuir(atual,inteiro(f,'usuario_id'),u.id,podeMontarEscala(u,culto.area_id)?null:u.congregacao_id);
        return 'erro' in resultado?fail(400,{erro:resultado.erro,cultoId}):resultado;
    },
    remover: async ({ request, locals }) => {
        const u = locals.user!;
        const f = await request.formData();
        const escala = (await buscarEscala(inteiro(f, 'id')));
        if (!escala)
            return fail(404, { erro: 'Escala não encontrada.' });
        if(!podeMontarEscala(u,escala.area_id)) return fail(403,{erro:'Sem acesso a esta congregacao.'});
        (await executar('DELETE FROM escalas WHERE id = ?', escala.id));
        await auditar(u.id,'escala_removida','escala',escala.id);
        return { ok: 'Retirado da escala.', cultoId: escala.culto_id };
    },
    tema: async ({ request, locals }) => {
        const f = await request.formData();
        const cultoId = inteiro(f, 'culto_id');
        const r = (await cultoGerenciavel(locals.user!, cultoId));
        if (!r.culto)
            return r.erro;
        await auditar(locals.user!.id,'escala_editada','culto',cultoId);
        (await executar('UPDATE cultos SET tema = ?, observacao = ? WHERE id = ?', texto(f, 'tema'), texto(f, 'observacao'), cultoId));
        return { ok: 'Tema atualizado.', cultoId };
    },
    cancelar: async ({ request, locals }) => {
        const f = await request.formData();
        const cultoId = inteiro(f, 'culto_id');
        const culto = (await buscarCulto(cultoId));
        if (!culto || !podeGerirCongregacao(locals.user,{id:culto.congregacao_id,area_id:culto.area_id})) {
            return fail(403, { erro: 'Somente a coordenação da área cancela cultos.' });
        }
        (await executar('UPDATE cultos SET cancelado = CASE cancelado WHEN 1 THEN 0 ELSE 1 END WHERE id = ?', cultoId));
        return { ok: 'Situação do culto atualizada.', cultoId };
    },
    novoCulto:async({locals,request})=>salvarEvento(locals.user!,await request.formData())
};
