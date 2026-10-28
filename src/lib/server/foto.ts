import { fail } from '@sveltejs/kit';
import { executar } from './db';
import { auditar } from './auditoria';

export async function salvarFoto(id:number,f:FormData){
 const arquivo=f.get('foto');
 if(!(arquivo instanceof File)||!arquivo.size)return fail(400,{erro:'Selecione uma foto.',secao:'foto'});
 if(arquivo.size>512*1024)return fail(400,{erro:'A foto deve ter até 512 KB. Selecione uma imagem menor.',secao:'foto'});
 const b=Buffer.from(await arquivo.arrayBuffer());
 const tipo=b.length>12&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':
  b.length>4&&b[0]===255&&b[1]===216&&b[2]===255&&b[b.length-2]===255&&b[b.length-1]===217?'image/jpeg':
  b.length>12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'?'image/webp':null;
 if(!tipo||arquivo.type!==tipo)return fail(400,{erro:'Use uma foto JPG, PNG ou WebP válida.',secao:'foto'});
 await executar('UPDATE usuarios SET foto_perfil=?,foto_versao=foto_versao+1 WHERE id=?',`data:${tipo};base64,${b.toString('base64')}`,id);
 await auditar(id,'foto_atualizada','usuario',id);
 return {ok:'Foto de perfil atualizada.',secao:'foto'};
}
export async function removerFoto(id:number){
 await executar('UPDATE usuarios SET foto_perfil=NULL,foto_versao=foto_versao+1 WHERE id=?',id);
 await auditar(id,'foto_removida','usuario',id);
 return {ok:'Foto removida.',secao:'foto'};
}
