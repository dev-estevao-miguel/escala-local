import { todos, um, executar, transacao } from '#lib/server/db';
import { igrejaRestrita, podeGerirArea } from '#lib/util';
import { exigir } from '#lib/server/auth';
import { auditar } from '#lib/server/auditoria';
import { bloquearArea } from '#lib/server/elegibilidade';
import { fail } from '@sveltejs/kit';
export const load = async ({ locals }) => {
    const area = locals.area!;
    // O Pb vê só a própria igreja.
    const igreja = igrejaRestrita(locals.user);
    const congregacoes = (await todos<{
        id: number;
        codigo: string;
        nome: string;
        endereco: string;
        maps: string;
        sede: number;
        polo: string;
        pontos: number;
        obreiros: number;
    }>(`SELECT g.*,
		        (SELECT COUNT(*) FROM pontos_pregacao p WHERE p.congregacao_id = g.id AND p.ativo = 1) AS pontos,
		        (SELECT COUNT(*) FROM usuarios u WHERE u.congregacao_id = g.id AND u.status = 'ativo') AS obreiros
		 FROM congregacoes g WHERE g.habilitada = 1 AND g.area_id = ? AND (? IS NULL OR g.id = ?) ORDER BY g.codigo`, area.id, igreja, igreja));
    const responsaveis = (await todos<{
        congregacao_id: number;
        nome: string;
    }>(`SELECT u.congregacao_id, u.nome FROM usuarios u JOIN congregacoes g ON g.id = u.congregacao_id
		 WHERE u.perfil = 'pb' AND u.status = 'ativo' AND g.area_id = ? ORDER BY u.nome`, area.id));
    return {
        podeTrocar: podeGerirArea(locals.user,area.id),
        candidatos: podeGerirArea(locals.user,area.id)?await todos<{id:number;nome:string}>("SELECT id,nome FROM usuarios WHERE area_id=? AND perfil IN ('obreiro','pb') AND status='ativo' AND cargo IN ('Presbítero','Diácono') ORDER BY nome",area.id):[],
        congregacoes: congregacoes.map((c) => ({
            ...c,
            responsaveis: responsaveis.filter((r) => r.congregacao_id === c.id).map((r) => r.nome)
        }))
    };
};
export const actions={
 responsavel:async({locals,request})=>{
  const u=locals.user!,area=locals.area!;exigir(podeGerirArea(u,area.id));const f=await request.formData(),igreja=Number(f.get('congregacao_id')),id=Number(f.get('usuario_id'));
  if(!await um('SELECT id FROM congregacoes WHERE id=? AND area_id=?',igreja,area.id))return fail(403,{erro:'Congregação fora da sua área.'});
  return transacao(async()=>{
   await bloquearArea(area.id);
   if(id&&!await um("SELECT id FROM usuarios WHERE id=? AND area_id=? AND status='ativo' AND perfil IN ('pb','obreiro') AND cargo IN ('Presbítero','Diácono')",id,area.id))return fail(400,{erro:'Selecione um Presbítero ou Diácono ativo desta área.'});
   await executar("UPDATE usuarios SET perfil='obreiro',gerencia_escala=0,credencial_versao=credencial_versao+1 WHERE congregacao_id=? AND perfil='pb'",igreja);
   if(id)await executar("UPDATE usuarios SET perfil='pb',congregacao_id=?,gerencia_escala=0,credencial_versao=credencial_versao+1 WHERE id=?",igreja,id);
   await auditar(u.id,'responsavel_alterado','congregacao',igreja);return {ok:'Responsável atualizado. Histórico preservado.'};
  });
 }
};
