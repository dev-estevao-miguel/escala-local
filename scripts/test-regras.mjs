import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
// Executa as funções reais; somente a resolução de módulos é adaptada para o Node.
const uri=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const util=uri(stripTypeScriptTypes(readFileSync('src/lib/util.ts','utf8')));
const codigo=stripTypeScriptTypes(readFileSync('src/lib/elegibilidade.ts','utf8')).replace("'./util'",JSON.stringify(util));
const {canWorkerBeAssigned,ordenarPorCarga}=await import(uri(codigo));
const u={id:1,status:'ativo',perfil:'obreiro',area_id:15,congregacao_id:1};
const c={id:1,data:'2026-11-02',hora_inicio:'19:00',hora_fim:'21:00',tipo:'Pregação',area_id:15,congregacao_id:1,cancelado:0};
const cargos=['Pastor','Evangelista','Presbítero','Diácono','Auxiliar Oficial','Auxiliar Local'];
for(const [tipo,n] of [['Santa Ceia',3],['Doutrina',4],['Pregação',6]])for(const [i,cargo] of cargos.entries())assert.equal(canWorkerBeAssigned({...u,cargo},{...c,tipo},['1-noite'],false,false)==='',i<n,`${tipo}: ${cargo}`);
for(const perfil of ['coordenador','vice'])for(const cargo of cargos)assert.equal(canWorkerBeAssigned({...u,perfil,cargo},c,['1-noite'],false,false)==='',cargos.indexOf(cargo)<3);
for(const cargo of cargos){
 assert.match(canWorkerBeAssigned({...u,cargo},c,[],false,false),/disponibilidade/);
 assert.match(canWorkerBeAssigned({...u,cargo},c,['1-noite'],true,false),/indisponibilidade/);
 assert.match(canWorkerBeAssigned({...u,cargo},c,['1-noite'],false,true),/horário/);
}
assert.match(canWorkerBeAssigned({...u,cargo:'Pastor',area_id:20},c,['1-noite'],false,false),/outra área/);
assert.match(canWorkerBeAssigned({...u,cargo:'Pastor',status:'inativo'},c,['1-noite'],false,false),/inativo/);
assert.equal(ordenarPorCarga([{id:1,n:10,ultima:'2026-10-19'},{id:2,n:2,ultima:'2026-10-19'}])[0].id,2);
assert.equal(ordenarPorCarga([{id:3,n:2,ultima:'2026-10-19'},{id:2,n:2,ultima:'2026-10-18'}])[0].id,2);
assert.equal(ordenarPorCarga([{id:3,n:2,ultima:''},{id:2,n:2,ultima:''}])[0].id,2);
console.log('Regras: 18 combinações de culto/cargo, coordenador/vice, disponibilidade, exceções, conflitos, status, área e justiça 10×2 validados.');
