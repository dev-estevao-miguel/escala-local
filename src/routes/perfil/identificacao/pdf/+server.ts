import { error } from '@sveltejs/kit';
import { um } from '#lib/server/db';
import { gerarIdentificacao, type Identificacao } from '#lib/server/identificacao';

/** A identificação sempre pertence à sessão; parâmetros não escolhem outra conta. */
export const GET = async ({locals}) => {
 const dados=await um<Identificacao>(`SELECT u.nome,u.carteira,u.cargo,u.perfil,a.codigo AS area,g.nome AS congregacao,u.foto_perfil AS foto
  FROM usuarios u LEFT JOIN areas a ON a.id=u.area_id LEFT JOIN congregacoes g ON g.id=u.congregacao_id
  WHERE u.id=? AND u.status='ativo'`,locals.user!.id);
 if(!dados)error(404,'Cadastro não encontrado.');
 const pdf=await gerarIdentificacao(dados);
 return new Response(new Uint8Array(pdf),{headers:{
  'Content-Type':'application/pdf',
  'Content-Disposition':`attachment; filename="identificacao-obreiro-${dados.carteira.replace(/\D/g,'')}.pdf"`,
  'Cache-Control':'private, no-store'
 }});
};
