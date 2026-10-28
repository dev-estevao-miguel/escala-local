import { exigir } from '#lib/server/auth';
import { todos,um,verificarBanco } from '#lib/server/db';
import { ehAdminGeral } from '#lib/util';
export const load=async({locals})=>{
 exigir(ehAdminGeral(locals.user));
 const [banco,registros,contagem]=await Promise.allSettled([
  verificarBanco(),
  todos<{id:number;quando:string;rota:string;mensagem:string}>('SELECT id,quando,rota,mensagem FROM erros ORDER BY id DESC LIMIT 30'),
  um<{total:number}>('SELECT COUNT(*) AS total FROM erros')
 ]);
 return {
  banco:{ok:banco.status==='fulfilled',mensagem:banco.status==='fulfilled'?banco.value:'Não foi possível verificar o banco. Confira a conexão e tente novamente.'},
  erros:registros.status==='fulfilled'?registros.value:[],
  total:contagem.status==='fulfilled'?contagem.value?.total??0:null,
  registrosDisponiveis:registros.status==='fulfilled'&&contagem.status==='fulfilled',
  verificadoEm:new Date().toISOString()
 };
};
