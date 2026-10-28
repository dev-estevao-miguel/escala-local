import { cargoPermitido, CARGOS, diaSemana, turnoDoHorario } from './util';
export interface Servico {id:number;data:string;hora_inicio:string;hora_fim:string;tipo:string;area_id:number;congregacao_id:number;cancelado:number}
export interface Trabalhador {id:number;cargo:string;perfil:string;status:string;area_id:number;congregacao_id:number|null}
export interface Ocupacao {usuario_id:number;data:string;hora_inicio:string;hora_fim:string}
export function canWorkerBeAssigned(u:Trabalhador,c:Servico,disp:string[],excecao:boolean,conflito:boolean) {
 if(u.status!=='ativo') return 'O obreiro está inativo.';
 if(c.cancelado) return 'Este culto está cancelado.';
 if(u.area_id!==c.area_id) return 'O obreiro pertence a outra área.';
 if(!CARGOS.some(v=>v.nome===u.cargo)||!cargoPermitido(c.tipo,u.cargo)||(['coordenador','vice'].includes(u.perfil)&&!['Pastor','Evangelista','Presbítero'].includes(u.cargo))) return 'Cargo não permitido para este culto.';
 if(!disp.includes(`${diaSemana(c.data)}-${turnoDoHorario(c.hora_inicio)}`)) return 'O obreiro não tem disponibilidade neste dia e turno.';
 if(excecao) return 'O obreiro informou indisponibilidade nesta data.';
 if(conflito) return 'O obreiro já possui escala neste horário.';
 return '';
}
export interface Carga {id:number;n:number;ultima:string}
export function ordenarPorCarga<T extends Carga>(candidatos:T[]) {return candidatos.sort((a,b)=>a.n-b.n||a.ultima.localeCompare(b.ultima)||a.id-b.id);}
