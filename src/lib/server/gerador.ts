import {ordenarPorCarga} from '#lib/elegibilidade';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { todos } from './db';
import { motivoInelegivel, type Servico, type Ocupacao } from './elegibilidade';
export interface Proposta extends Ocupacao {culto_id:number;nome:string;cargo:string;tipo:string;nome_evento:string;congregacao:string;anteriores:number}
export async function gerarPrevia(areaId:number,inicio:string,fim:string,igreja:number|null=null){
 const cultos=await todos<Servico&{congregacao:string;nome_evento:string}>(`SELECT c.*,t.nome AS tipo,g.area_id,g.nome AS congregacao FROM cultos c JOIN tipos_culto t ON t.id=c.tipo_culto_id JOIN congregacoes g ON g.id=c.congregacao_id WHERE g.area_id=? AND c.data>=? AND c.data<=? AND c.cancelado=0 AND (? IS NULL OR g.id=?) AND NOT EXISTS(SELECT 1 FROM escalas e WHERE e.culto_id=c.id) ORDER BY c.data,c.hora_inicio,c.id`,areaId,inicio,fim,igreja,igreja);
 const usuarios=await todos<{id:number;nome:string;cargo:string;n:number;ultima:string}>(`SELECT u.id,u.nome,u.cargo,(SELECT COUNT(*) FROM escalas e JOIN cultos c ON c.id=e.culto_id WHERE e.usuario_id=u.id AND c.cancelado=0 AND e.autorizacao='autorizada') AS n,COALESCE((SELECT MAX(c.data) FROM escalas e JOIN cultos c ON c.id=e.culto_id WHERE e.usuario_id=u.id AND c.cancelado=0),'') AS ultima FROM usuarios u WHERE u.area_id=? AND u.status='ativo' AND u.perfil<>'admin' AND (? IS NULL OR u.congregacao_id=?) ORDER BY u.id`,areaId,igreja,igreja);
 const propostas:Proposta[]=[],semCandidato:{id:number;data:string;tipo:string;congregacao:string}[]=[];
 for(const c of cultos){
  const elegiveis=[];
  for(const u of usuarios) if(!await motivoInelegivel(u.id,c,propostas)) elegiveis.push(u);
  ordenarPorCarga(elegiveis);
  const u=elegiveis[0];
  if(!u){semCandidato.push({id:c.id,data:c.data,tipo:c.tipo,congregacao:c.congregacao});continue;}
  propostas.push({culto_id:c.id,usuario_id:u.id,nome:u.nome,cargo:u.cargo,nome_evento:c.nome_evento,data:c.data,hora_inicio:c.hora_inicio,hora_fim:c.hora_fim,tipo:c.tipo,congregacao:c.congregacao,anteriores:u.n});u.n++;u.ultima=c.data;
 }
 return {propostas,semCandidato};
}
// Assina a prévia; a confirmação recalcula tudo e exige a mesma distribuição.
export function assinaturaPrevia(actor:number,inicio:string,fim:string,previa:Awaited<ReturnType<typeof gerarPrevia>>) {
 if(!process.env.SESSAO_SEGREDO) throw new Error('Configure SESSAO_SEGREDO no .env.');
 const resumo=createHash('sha256').update(JSON.stringify(previa)).digest('hex');
 return createHmac('sha256',process.env.SESSAO_SEGREDO).update(`${actor}|${inicio}|${fim}|${resumo}`).digest('hex');
}
export function conferirPrevia(a:string,b:string){return /^[a-f0-9]{64}$/.test(a)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
