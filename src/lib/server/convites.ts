import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { fail } from '@sveltejs/kit';
import { exigir } from './auth';
import { executar, transacao, um } from './db';
import { criarObreiro, lerObreiro, validarSenha } from './obreiros';
import { inteiro, texto } from './form';
import { conferirSenha } from './senha';
import { auditar } from './auditoria';
import { ehAdmin, ehAdminGeral, ehPb, hojeISO, type Usuario, type Perfil } from '#lib/util';
export const cargosConvite=(p:Perfil)=>['coordenador','vice'].includes(p)?['Pastor','Evangelista','Presbítero']:p==='pb'?['Presbítero','Diácono']:['Diácono','Auxiliar Oficial','Auxiliar Local'];
export const perfisConvite=(u:Usuario):Perfil[]=>ehAdminGeral(u)?['coordenador']:ehAdmin(u)?['pb','obreiro']:ehPb(u)?['obreiro']:[];
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function chave(){if(!process.env.SESSAO_SEGREDO)throw new Error('Configure SESSAO_SEGREDO.');return createHash('sha256').update(`convites:${process.env.SESSAO_SEGREDO}`).digest();}
function cifrar(token:string){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',chave(),iv);const dados=Buffer.concat([c.update(token,'utf8'),c.final()]);return [iv,c.getAuthTag(),dados].map(b=>b.toString('base64url')).join('.');}
function decifrar(valor:string){const [iv,tag,valorCifrado]=valor.split('.').map(v=>Buffer.from(v,'base64url'));const d=createDecipheriv('aes-256-gcm',chave(),iv);d.setAuthTag(tag);return Buffer.concat([d.update(valorCifrado),d.final()]).toString('utf8');}
export async function bloquearAdministracao(){await executar("INSERT INTO config(chave,valor) VALUES ('administracao_lock','1') ON CONFLICT(chave) DO NOTHING");await executar("UPDATE config SET valor=valor WHERE chave='administracao_lock'");}
interface Convite{token:string;token_cifrado:string|null;criado_por:number;area_id:number|null;area:string|null;polo:string|null;congregacao_id:number|null;criado_por_nome:string;criado_por_perfil:Perfil;perfil:Perfil;revogado:number;expira_em:string|null;max_uses:number|null;current_uses:number}
const caminho=(p:Perfil)=>p==='coordenador'?'coordenador':p==='pb'?'responsavel':'obreiro';
function apresentar(c:Convite){return {link:`/convite/${caminho(c.perfil)}/${decifrar(c.token_cifrado!)}`,usos:c.current_uses};}
export async function conviteAtivo(perfil:Perfil,areaId:number|null){
 const c=await um<Convite>('SELECT * FROM convites WHERE perfil=? AND revogado=0 AND ((area_id IS NULL AND ? IS NULL) OR area_id=?) AND token_cifrado IS NOT NULL ORDER BY criado_em DESC LIMIT 1',perfil,areaId,areaId);
 if(!c)return null;try{return apresentar(c);}catch{return null;}
}
export async function emitirConvite(u:Usuario,areaId:number|null,f:FormData){
 const perfil=(texto(f,'perfil')||'obreiro') as Perfil;
 exigir(perfisConvite(u).includes(perfil),'Você não pode convidar este perfil.');
 if(ehAdminGeral(u)){exigir(perfil==='coordenador');areaId=null;}else exigir(!!areaId&&u.area_id===areaId);
 const congregacao=perfil==='obreiro'?(ehPb(u)?u.congregacao_id:inteiro(f,'congregacao_id')):null;
 if(perfil==='obreiro'&&(!congregacao||!await um('SELECT id FROM congregacoes WHERE id=? AND area_id=?',congregacao,areaId)))return fail(400,{erro:'Selecione obrigatoriamente a congregação do obreiro.'});
 return transacao(async()=>{
  await bloquearAdministracao();
  if(perfil!=='obreiro'){
   if(texto(f,'regenerar')!=='1'){const ativo=await conviteAtivo(perfil,areaId);if(ativo)return {ok:'Convite ativo disponível.',...ativo};}
   await executar('UPDATE convites SET revogado=1,revogado_em=CURRENT_TIMESTAMP WHERE perfil=? AND revogado=0 AND ((area_id IS NULL AND ? IS NULL) OR area_id=?)',perfil,areaId,areaId);
  }
  const token=randomBytes(32).toString('base64url');
  await executar('INSERT INTO convites(token,token_cifrado,criado_por,area_id,congregacao_id,expira_em,perfil,tipo,max_uses) VALUES (?,?,?,?,?,NULL,?,?,NULL)',hash(token),cifrar(token),u.id,areaId,congregacao,perfil,perfil==='coordenador'?'COORDINATOR':perfil==='pb'?'AREA_RESPONSIBLE':'CHURCH_WORKER');
  await auditar(u.id,texto(f,'regenerar')==='1'?'convite_regenerado':'convite_criado','convite',hash(token));
  return {ok:'Convite reutilizável disponível.',link:`/convite/${caminho(perfil)}/${token}`,usos:0};
 });
}
export async function estadoConvite(token:string){
 if(!/^[\w-]{43}$/.test(token))return {erro:'Convite inválido.'};
 const c=await um<Convite>(`SELECT c.*,a.codigo AS area,a.polo,u.nome AS criado_por_nome,u.perfil AS criado_por_perfil FROM convites c LEFT JOIN areas a ON a.id=c.area_id JOIN usuarios u ON u.id=c.criado_por WHERE c.token=? AND u.status='ativo' AND ((c.perfil='coordenador' AND c.area_id IS NULL AND u.perfil='admin') OR (c.area_id=u.area_id AND ((u.perfil IN ('coordenador','vice') AND c.perfil IN ('pb','obreiro','vice')) OR (u.perfil='pb' AND c.perfil='obreiro' AND u.congregacao_id=c.congregacao_id))))`,hash(token));
 if(!c)return {erro:'Convite inválido ou emissor sem permissão.'};
 if(c.revogado)return {erro:'Este convite foi revogado.'};
 if(c.expira_em&&c.expira_em<hojeISO())return {erro:'Este convite expirou.'};
 if(c.max_uses!==null&&c.current_uses>=c.max_uses)return {erro:'Este convite atingiu o limite de usos.'};
 return {convite:c};
}
export async function buscarConvite(token:string){return (await estadoConvite(token)).convite;}
export async function registrarPorConvite(token:string,f:FormData,usuario:Usuario|null=null){
 return transacao(async()=>{
  await bloquearAdministracao();
  const estado=await estadoConvite(token),c=estado.convite;
  if(!c)return fail(410,{erro:estado.erro,valores:undefined});
  const funcao=texto(f,'funcao');
  const coordenacao=c.perfil==='coordenador'&&c.area_id===null;
  if(funcao&&!(coordenacao?['coordenador','vice']: [c.perfil]).includes(funcao))return fail(403,{erro:'Função não permitida para este convite.',valores:undefined});
  const perfilCadastro=(coordenacao&&funcao?funcao:c.perfil) as Perfil;
  if(f.has('area_id')&&inteiro(f,'area_id')!==(c.area_id||0))return fail(403,{erro:'Área incompatível com o convite.',valores:undefined});
  if(c.congregacao_id&&f.has('congregacao_id')&&inteiro(f,'congregacao_id')!==c.congregacao_id)return fail(403,{erro:'Congregação incompatível com o convite.',valores:undefined});
  if(c.congregacao_id)f.set('congregacao_id',String(c.congregacao_id));
  const existente=await um<{id:number;senha_hash:string;perfil:Perfil;area_id:number|null;status:string}>('SELECT id,senha_hash,perfil,area_id,status FROM usuarios WHERE carteira=?',texto(f,'carteira'));
  if(existente&&usuario?.id!==existente.id&&!conferirSenha(texto(f,'senha_atual'),existente.senha_hash))return fail(409,{erro:'Esta carteira já está cadastrada. Informe a senha atual para confirmar sua identidade.',valores:undefined});
  if(existente&&(existente.status!=='ativo'||existente.perfil!=='obreiro'||existente.area_id!==c.area_id||c.perfil!=='pb'))return fail(409,{erro:'Este vínculo precisa ser corrigido pela administração.',valores:undefined});
  const semIgreja=['coordenador','vice'].includes(c.perfil);
  const {d,erro}=await lerObreiro(f,c.area_id||0,existente?.id||0,semIgreja);
  const senha=String(f.get('senha')??'');
  const problema=erro||(!cargosConvite(c.perfil).includes(d.cargo)?'Cargo não permitido para este convite.':'')||(!existente?validarSenha(senha,String(f.get('senha2')??'')):'');
  if(problema)return fail(400,{erro:problema,valores:{...d,funcao:perfilCadastro}});
  if(c.perfil==='pb'&&await um("SELECT id FROM usuarios WHERE congregacao_id=? AND perfil='pb' AND status='ativo'",d.congregacao_id))return fail(409,{erro:'Esta congregação já possui responsável. Solicite a troca à coordenação.',valores:d});
  const reserva=await executar('UPDATE convites SET current_uses=current_uses+1,usado_em=CURRENT_TIMESTAMP WHERE token=? AND revogado=0 AND (max_uses IS NULL OR current_uses<max_uses)',c.token);
  if(!reserva.alteradas)return fail(410,{erro:'Convite revogado ou esgotado.',valores:d});
  const id=existente?.id||await criarObreiro({...d,congregacao_id:semIgreja?0:d.congregacao_id},senha,{status:'ativo',perfil:perfilCadastro,cadastradoPor:c.criado_por,aprovadoPor:c.criado_por,areaId:c.area_id||undefined});
  if(coordenacao)await executar('UPDATE usuarios SET pode_definir_area=1 WHERE id=?',id);
  if(existente)await executar('UPDATE usuarios SET perfil=?,congregacao_id=?,cargo=?,credencial_versao=credencial_versao+1 WHERE id=?',c.perfil,d.congregacao_id,d.cargo,id);
  await executar('UPDATE convites SET usado_por=? WHERE token=?',id,c.token);
  await auditar(id,'cadastro_por_convite','usuario',id);return {concluido:true,nome:d.nome,imediato:true,id};
 });
}
