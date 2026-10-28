import { executar } from './db';
export const auditar = (actor: number | null, action: string, entity: string, id: string | number) =>
 executar('INSERT INTO auditoria(actor,action,entity,entity_id) VALUES (?,?,?,?)',actor,action,entity,String(id));
