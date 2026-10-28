import {executar,transacao,um} from './db';
import {interpretarQuando} from './semente';
import type {IgrejaCatalogo} from './catalogo';

export async function ativarIgrejas(areaId:number,itens:{igreja:IgrejaCatalogo;importar:boolean}[],quantidade:number){
  return transacao(async()=>{
    await executar('UPDATE areas SET configurada=configurada WHERE id=?',areaId);
    for(const {igreja:c,importar} of itens){
      let existente=await um<{id:number;habilitada:number}>('SELECT id,habilitada FROM congregacoes WHERE codigo=? AND area_id=?',c.codigo,areaId);
      if(existente?.habilitada&&(!importar||await um('SELECT id FROM agenda WHERE congregacao_id=?',existente.id)))continue;
      let id=existente?.id;
      if(!id)id=(await executar('INSERT INTO congregacoes(area_id,codigo,nome,endereco,maps,sede,habilitada) VALUES (?,?,?,?,?,?,1)',areaId,c.codigo,c.nome,c.endereco,c.maps,c.sede?1:0)).id;
      else await executar('UPDATE congregacoes SET habilitada=1,nome=?,endereco=?,maps=?,sede=? WHERE id=?',c.nome,c.endereco,c.maps,c.sede?1:0,id);
      // A cópia do catálogo não altera igrejas que já foram ativadas e editadas pela coordenação.
      // Importa somente se não houver agenda; preserva os eventos configurados.
      if(importar){
        for(const item of c.agenda){
          let tipo=await um<{id:number;hora_inicio:string;hora_fim:string}>('SELECT id,hora_inicio,hora_fim FROM tipos_culto WHERE lower(nome)=lower(?)',item.culto);
          if(!tipo){const novo=await executar('INSERT INTO tipos_culto(nome) VALUES (?)',item.culto);tipo={id:novo.id,hora_inicio:'19:00',hora_fim:'21:00'};}
          for(const r of interpretarQuando(item.quando)){
            const inicio=r.periodo==='dia'?'14:00':r.periodo==='noite'?'19:00':tipo.hora_inicio;
            const fim=r.periodo==='dia'?'16:00':r.periodo==='noite'?'21:00':tipo.hora_fim;
            await executar('INSERT INTO agenda(congregacao_id,tipo_culto_id,dia_semana,semana_mes,hora_inicio,hora_fim) VALUES (?,?,?,?,?,?)',id,tipo.id,r.dia,r.semana,inicio,fim);
          }
        }
      }
    }
    await executar('UPDATE areas SET configurada=1,quantidade_prevista=? WHERE id=?',quantidade,areaId);
  });
}
