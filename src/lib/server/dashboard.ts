import { todos,um } from './db';
import { hojeISO,diaSemana,somarDias } from '#lib/util';
export async function resumoDashboard(areaId:number){
 const hoje=hojeISO(),ano=hoje.slice(0,4),mesAtual=Number(hoje.slice(5,7))-1;
 const pessoas=await todos<{id:number}>("SELECT id FROM usuarios WHERE area_id=? AND status='ativo' AND perfil<>'admin'",areaId);
 const disponibilidades=await todos<{usuario_id:number;dia_semana:number}>('SELECT d.usuario_id,d.dia_semana FROM disponibilidades d JOIN usuarios u ON u.id=d.usuario_id WHERE u.area_id=?',areaId);
 const excecoes=await todos<{usuario_id:number;inicio:string;fim:string}>('SELECT i.usuario_id,i.inicio,i.fim FROM indisponibilidades i JOIN usuarios u ON u.id=i.usuario_id WHERE u.area_id=? AND i.fim>=? AND i.inicio<=?',areaId,`${ano}-01-01`,`${ano}-12-31`);
 const atribuicoes=await todos<{usuario_id:number;culto_id:number;data:string}>("SELECT e.usuario_id,e.culto_id,c.data FROM escalas e JOIN cultos c ON c.id=e.culto_id JOIN congregacoes g ON g.id=c.congregacao_id WHERE g.area_id=? AND c.cancelado=0 AND e.autorizacao='autorizada' AND c.data>=? AND c.data<=?",areaId,`${ano}-01-01`,`${ano}-12-31`);
 const meses=Array.from({length:12},(_,m)=>{
  const inicio=`${ano}-${String(m+1).padStart(2,'0')}-01`,proximo=m===11?`${Number(ano)+1}-01-01`:`${ano}-${String(m+2).padStart(2,'0')}-01`;
  const dias:string[]=[];for(let d=inicio;d<proximo;d=somarDias(d,1))dias.push(d);
  const disponiveis=pessoas.filter(p=>dias.some(d=>disponibilidades.some(a=>a.usuario_id===p.id&&a.dia_semana===diaSemana(d))&&!excecoes.some(e=>e.usuario_id===p.id&&e.inicio<=d&&e.fim>=d))).length;
  const escalas=atribuicoes.filter(e=>e.data>=inicio&&e.data<proximo);
  return {mes:['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m],disponiveis,escalados:new Set(escalas.map(e=>e.usuario_id)).size,atendidas:new Set(escalas.map(e=>e.culto_id)).size};
 });
 return {ano,mesAtual,meses,congregacoes:(await um<{n:number}>('SELECT COUNT(*) AS n FROM congregacoes WHERE area_id=? AND habilitada=1',areaId))!.n,disponiveis:meses[mesAtual].disponiveis,escalados:meses[mesAtual].escalados};
}
