import { lerCatalogo } from './catalogo';
import { executar, transacao, um } from './db';
const numero = (n: string) => String(Number(n));
export const churchDirectoryService = {
 async getAreas() { return [...new Set((await lerCatalogo()).itens.map(c=>numero(c.area)))]; },
 async getChurchesByArea(area: string) { return (await lerCatalogo()).itens.filter(c=>numero(c.area)===numero(area)); },
 async findChurch(codigo: string) { return (await lerCatalogo()).itens.find(c=>c.codigo===codigo); },
 async validateChurchArea(codigo: string, area: string) { const c=await this.findChurch(codigo); return !!c&&numero(c.area)===numero(area); }
};
export async function aderirArea(codigo: string) {
 if(!/^\d{1,3}$/.test(codigo)) throw new Error('Informe um número de área válido.');
 const igrejas=await churchDirectoryService.getChurchesByArea(codigo);
 if(!igrejas.length) throw new Error('Área não encontrada no diretório da DEMO.');
 return transacao(async()=>{
  const existente=await um<{id:number}>('SELECT id FROM areas WHERE CAST(codigo AS INTEGER)=?',Number(codigo));
  const id=existente?.id || (await executar('INSERT INTO areas(codigo,polo,configurada,quantidade_prevista) VALUES (?,?,1,?)',numero(codigo),igrejas.find(c=>c.sede)?.nome || igrejas[0].polo,igrejas.length)).id;
  for(const c of igrejas) await executar('INSERT OR IGNORE INTO congregacoes(area_id,codigo,nome,endereco,maps,sede,polo,habilitada) VALUES (?,?,?,?,?,?,?,1)',id,c.codigo,c.nome,c.endereco,c.maps,c.sede?1:0,c.polo);
  return id;
 });
}
