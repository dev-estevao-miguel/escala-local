import { todos } from '#lib/server/db';
import { inteiro } from '#lib/server/form';
import { salvarEvento,excluirEvento } from '#lib/server/eventos';
import { listarCongregacoes } from '#lib/server/obreiros';
import { igrejaRestrita,ehAdmin,ehPb,hojeISO,dataValida,somarDias } from '#lib/util';
export const load=async({locals,url})=>{
 const area=locals.area!,coordenacao=ehAdmin(locals.user),igreja=igrejaRestrita(locals.user),inicio=dataValida(url.searchParams.get('inicio'))?url.searchParams.get('inicio')!:hojeISO(),fim=dataValida(url.searchParams.get('fim'))?url.searchParams.get('fim')!:somarDias(inicio,60);
 const congregacao=igreja??(Number(url.searchParams.get('cong'))||0),tipo=Number(url.searchParams.get('tipo'))||0;
 const eventos=await todos<{id:number;nome_evento:string;data:string;hora_inicio:string;hora_fim:string;local_evento:string;observacao:string;tipo_culto_id:number;congregacao:string;congregacao_id:number;tipo:string;polo:string}>(`SELECT c.id,c.nome_evento,c.data,c.hora_inicio,c.hora_fim,c.local_evento,c.observacao,c.tipo_culto_id,g.nome AS congregacao,g.id AS congregacao_id,t.nome AS tipo,COALESCE(NULLIF(g.polo,''),a.polo) AS polo FROM cultos c JOIN congregacoes g ON g.id=c.congregacao_id JOIN areas a ON a.id=g.area_id JOIN tipos_culto t ON t.id=c.tipo_culto_id WHERE g.area_id=? AND c.cancelado=0 AND c.data>=? AND c.data<=? AND (?=0 OR g.id=?) AND (?=0 OR t.id=?) ORDER BY c.data,c.hora_inicio,g.nome`,area.id,inicio,fim,congregacao,congregacao,tipo,tipo);
 const escalados=await todos<{culto_id:number;usuario_id:number;nome:string;cargo:string}>(`SELECT e.culto_id,e.usuario_id,u.nome,u.cargo FROM escalas e JOIN usuarios u ON u.id=e.usuario_id JOIN cultos c ON c.id=e.culto_id JOIN congregacoes g ON g.id=c.congregacao_id WHERE g.area_id=? AND c.cancelado=0 AND c.data>=? AND c.data<=? AND e.autorizacao='autorizada' AND (?=0 OR g.id=?) AND (?=0 OR c.tipo_culto_id=?) ORDER BY u.nome`,area.id,inicio,fim,congregacao,congregacao,tipo,tipo);
 return {inicio,fim,coordenacao,congregacao,tipo,podeEditar:ehPb(locals.user),congregacoes:coordenacao?await listarCongregacoes(area.id):[],tipos:await todos<{id:number;nome:string;codigo_cc:string}>('SELECT id,nome,codigo_cc FROM tipos_culto WHERE ativo=1 ORDER BY nome'),eventos:eventos.map(e=>({...e,escalados:escalados.filter(s=>s.culto_id===e.id)}))};
};
export const actions={salvar:async({locals,request})=>salvarEvento(locals.user!,await request.formData()),excluir:async({locals,request})=>excluirEvento(locals.user!,inteiro(await request.formData(),'id'))};
