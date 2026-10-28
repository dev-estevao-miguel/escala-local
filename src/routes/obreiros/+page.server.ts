import { auditar } from '#lib/server/auditoria';
import { emitirConvite, perfisConvite } from '#lib/server/convites';
import { fail } from '@sveltejs/kit';
import { exigir } from '#lib/server/auth';
import { executar, todos, um } from '#lib/server/db';
import { inteiro, texto } from '#lib/server/form';
import { disponibilidadesPorUsuario, listarCongregacoes } from '#lib/server/obreiros';
import { ehAdmin, ehPb, hojeISO, igrejaRestrita, podeCadastrarObreiro, podeGerirArea, somarDias } from '#lib/util';
const VALIDADE_CONVITE_DIAS = 7;
export const load = async ({ locals, url }) => {
    const u = locals.user!;
    const area = locals.area!;
    exigir(podeCadastrarObreiro(u), 'Acesso restrito à coordenação e aos Pbs responsáveis.');
    const disponibilidades = (await disponibilidadesPorUsuario());
    // O Pb vê só os obreiros da própria igreja.
    const igreja = igrejaRestrita(u);
    const obreiros = (await todos<{
        id: number;
        nome: string;
        carteira: string;
        cargo: string;
        perfil: string;
        status: 'pendente' | 'ativo' | 'recusado' | 'inativo' | 'removido';
        whatsapp: string;
        congregacao_id: number;
        congregacao: string;
    }>(`SELECT u.id, u.nome, u.carteira, u.cargo, u.perfil, u.status, u.whatsapp, u.congregacao_id, COALESCE(g.nome,'Gestão da área') AS congregacao
		 FROM usuarios u LEFT JOIN congregacoes g ON g.id = u.congregacao_id
		 WHERE COALESCE(u.area_id,g.area_id) = ? AND (? IS NULL OR u.congregacao_id = ?)
		 ORDER BY u.nome`, area.id, igreja, igreja)).map((o) => ({ ...o, disponibilidade: disponibilidades.get(o.id) ?? [] }));
    const congregacoes = (await listarCongregacoes(area.id)).filter((c) => !igreja || c.id === igreja);
    return { obreiros, congregacoes };
};
export const actions = {
    criarConvite: async ({request,locals}) => emitirConvite(locals.user!,locals.area!.id,await request.formData()),
    delegar: async ({request,locals}) => {
      const u=locals.user!,area=locals.area!;
      exigir(podeGerirArea(u,area.id));
      const f=await request.formData(),id=inteiro(f,'id'),ativar=texto(f,'ativar')==='1';
      const alvo=await um<{perfil:string;status:string;area_id:number}>(`SELECT u.perfil,u.status,g.area_id FROM usuarios u JOIN congregacoes g ON g.id=u.congregacao_id WHERE u.id=?`,id);
      if(!alvo||alvo.area_id!==area.id||!['pb','obreiro'].includes(alvo.perfil)||alvo.status!=='ativo')return fail(400,{erro:'Selecione um obreiro ativo desta área.'});
      try {
        await executar('UPDATE usuarios SET gerencia_escala=? WHERE id=?',ativar?1:0,id);
        return {ok:ativar?'Permissão para montar escalas concedida.':'Permissão para montar escalas removida.'};
      }catch(e){if(String(e).includes('Limite de dois'))return fail(400,{erro:'A área já possui dois responsáveis. Remova uma delegação antes de adicionar outra.'});throw e;}
    },
    revogarConvite: async ({ request, locals }) => {
        const u = locals.user!;
        exigir(podeCadastrarObreiro(u));
        const f = await request.formData();
        const token = texto(f, 'token');
        const convite = (await um<{
            area_id: number;
            criado_por: number;
        }>('SELECT area_id, criado_por FROM convites WHERE token = ?', token));
        if (!convite || (convite.criado_por !== u.id && !podeGerirArea(u, convite.area_id))) {
            return fail(404, { erro: 'Link não encontrado.' });
        }
        const { alteradas } = (await executar('UPDATE convites SET revogado = 1, revogado_em=CURRENT_TIMESTAMP WHERE token = ?', token));
        if (!alteradas)
            return fail(404, { erro: 'Link não encontrado.' });
        await auditar(u.id,'convite_revogado','convite',token);
        return { ok: 'Link desativado.' };
    }
};
