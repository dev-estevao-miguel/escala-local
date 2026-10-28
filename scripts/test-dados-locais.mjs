import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
import {popularTestes,SENHA_TESTES} from './popular-testes-locais.mjs';
import {hashSenha,conferirSenha} from '../src/lib/server/senha.ts';
const db=new DatabaseSync(':memory:');
try{
 db.exec('PRAGMA foreign_keys=ON');
 for(const f of ['005_v119','006_simplificacao','007_foto_perfil','008_notificacoes'])db.exec(readFileSync('supabase/sqlite/'+f+'.sql','utf8'));
 const adminHash=hashSenha('Admin-Preservado-2026!');
 db.prepare("INSERT INTO usuarios(id,nome,carteira,senha_hash,cargo,perfil,status) VALUES(1,'Administrador','900001',?,'','admin','ativo')").run(adminHash);
 db.exec("INSERT INTO areas(id,codigo,polo) VALUES(1,'57','Polo teste');INSERT INTO congregacoes(id,area_id,codigo,nome,habilitada) VALUES(1,1,'5701','Igreja A',1),(2,1,'5702','Igreja B',1)");
 for(const [id,nome,carteira,cargo,perfil,status,igreja] of [[2,'Coordenador original','123456','Pastor','coordenador','ativo',null],[3,'Responsável original','654321','Presbítero','pb','ativo',1],[4,'Inativo original','2004','Diácono','obreiro','inativo',1],[5,'Removido original','removido-5','Diácono','obreiro','removido',null]]){
  db.prepare('INSERT INTO usuarios(id,nome,carteira,senha_hash,cargo,perfil,status,congregacao_id,area_id) VALUES(?,?,?, ?,?,?,?,?,1)').run(id,nome,carteira,hashSenha('Senha-Antiga-2026'),cargo,perfil,status,igreja);
 }
 db.exec("INSERT INTO tipos_culto(id,nome) VALUES(1,'Pregação');INSERT INTO cultos(id,data,congregacao_id,tipo_culto_id,hora_inicio,hora_fim,nome_evento) VALUES(1,'2026-10-20',1,1,'18:00','19:00','Culto preservado');INSERT INTO escalas(id,culto_id,usuario_id) VALUES(1,1,2)");
 const original=db.prepare('SELECT * FROM usuarios WHERE id=1').get();
 const primeiro=popularTestes(db,{inicio:'2026-10-19'});
 assert.equal(primeiro.pessoasNovas,14);assert.equal(primeiro.agendasNovas,18);assert.equal(primeiro.cultosNovos,98);
 assert.deepEqual(db.prepare('SELECT * FROM usuarios WHERE id=1').get(),original);
 for(const u of db.prepare("SELECT * FROM usuarios WHERE perfil<>'admin'").all())assert.equal(conferirSenha(SENHA_TESTES,u.senha_hash),true);
 assert.equal(db.prepare('SELECT status FROM usuarios WHERE id=4').get().status,'inativo');
 assert.equal(db.prepare('SELECT status FROM usuarios WHERE id=5').get().status,'removido');
 assert.equal(db.prepare('SELECT nome_evento FROM cultos WHERE id=1').get().nome_evento,'Culto preservado');
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM escalas').get().n,1);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM usuarios WHERE gerencia_escala=1').get().n,2);
 const n=db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n;
 const segundo=popularTestes(db,{inicio:'2026-10-19'});
 assert.equal(segundo.pessoasNovas,0);assert.equal(segundo.cultosNovos,0);assert.equal(segundo.agendasNovas,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n,n);
 assert.deepEqual(db.prepare('SELECT * FROM usuarios WHERE id=1').get(),original);
 // Executa a prévia real com um adaptador SQLite em memória, sem publicar na base do usuário.
 globalThis.__dbTesteDados=db;
 const uri=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
 const fonte=p=>stripTypeScriptTypes(readFileSync(p,'utf8'));
 const util=uri(fonte('src/lib/util.ts'));
 const cliente=uri(fonte('src/lib/elegibilidade.ts').replace("'./util'",JSON.stringify(util)));
 const adaptador=uri(`export async function todos(sql,...p){return globalThis.__dbTesteDados.prepare(sql).all(...p);}export async function um(sql,...p){return globalThis.__dbTesteDados.prepare(sql).get(...p);}export async function executar(sql,...p){return globalThis.__dbTesteDados.prepare(sql).run(...p);}export async function transacao(fn){return fn();}`);
 const auditoria=uri('export async function auditar(){}');
 const servidor=uri(fonte('src/lib/server/elegibilidade.ts').replace("'./db'",JSON.stringify(adaptador)).replace("'./auditoria'",JSON.stringify(auditoria)).replaceAll("'#lib/elegibilidade'",JSON.stringify(cliente)));
 const gerador=uri(fonte('src/lib/server/gerador.ts').replace("'#lib/elegibilidade'",JSON.stringify(cliente)).replace("'./db'",JSON.stringify(adaptador)).replace("'./elegibilidade'",JSON.stringify(servidor)));
 const {gerarPrevia}=await import(gerador);
 for(const [inicio,fim] of [['2026-10-19','2026-10-25'],['2026-11-02','2026-11-08']]){
  const previa=await gerarPrevia(1,inicio,fim);assert.ok(previa.propostas.length>=16);assert.equal(previa.semCandidato.length,0);
  for(const [i,p] of previa.propostas.entries())for(const q of previa.propostas.slice(i+1))assert.equal(p.usuario_id===q.usuario_id&&p.data===q.data&&p.hora_inicio<q.hora_fim&&q.hora_inicio<p.hora_fim,false);
  for(const p of previa.propostas.filter(p=>p.tipo==='Santa Ceia'))assert.ok(['Pastor','Evangelista','Presbítero'].includes(p.cargo));
 }
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM escalas').get().n,1);
 assert.equal(db.prepare('PRAGMA quick_check').get().quick_check,'ok');
 console.log('Dados locais: criação e reexecução sem duplicar; administrador e registros preservados; senha teste123; contas inativas mantidas; limite de 2 delegados; prévias reais sem vagas ou conflitos, inclusive Santa Ceia; nenhuma escala publicada.');
}finally{delete globalThis.__dbTesteDados;db.close();}
