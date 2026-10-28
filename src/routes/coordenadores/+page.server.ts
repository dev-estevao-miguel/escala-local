import { exigir } from '#lib/server/auth';
import { todos } from '#lib/server/db';
import { moverCoordenador,excluirCoordenador } from '#lib/server/coordenadores';
import { inteiro,texto } from '#lib/server/form';
import { ehAdminGeral } from '#lib/util';
export const load=async({locals})=>{
 exigir(ehAdminGeral(locals.user));
 return {coordenadores:await todos<{id:number;nome:string;carteira:string;cargo:string;perfil:'coordenador'|'vice';status:string;area:string|null}>("SELECT u.id,u.nome,u.carteira,u.cargo,u.perfil,u.status,a.codigo AS area FROM usuarios u LEFT JOIN areas a ON a.id=u.area_id WHERE u.perfil IN ('coordenador','vice') AND u.status<>'removido' ORDER BY u.nome")};
};
export const actions={
 vincular:async({locals,request})=>{exigir(ehAdminGeral(locals.user));const f=await request.formData();return moverCoordenador(locals.user!.id,inteiro(f,'id'),texto(f,'codigo'));},
 desvincular:async({locals,request})=>{exigir(ehAdminGeral(locals.user));return moverCoordenador(locals.user!.id,inteiro(await request.formData(),'id'),'');},
 excluir:async({locals,request})=>{exigir(ehAdminGeral(locals.user));const f=await request.formData();return excluirCoordenador(locals.user!.id,inteiro(f,'id'),texto(f,'carteira'));}
};
