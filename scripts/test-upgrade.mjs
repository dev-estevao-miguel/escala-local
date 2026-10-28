import {DatabaseSync} from 'node:sqlite';
import {PGlite} from '@electric-sql/pglite';
import {readdirSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const sql=readFileSync('supabase/sqlite/005_v119.sql','utf8');
const fixture=`INSERT INTO areas(id,codigo,polo) VALUES(1,'57','Polo preservado');
INSERT INTO congregacoes(id,area_id,codigo,nome,habilitada) VALUES(1,1,'5701','Igreja preservada',1);
INSERT INTO usuarios(id,nome,carteira,senha_hash,cargo,perfil,area_id,congregacao_id,status) VALUES
(1,'Admin','900001','hash','','admin',1,1,'ativo'),(2,'Coordenador','0001','hash','Presbítero','coordenador',1,NULL,'ativo'),(3,'Obreiro','0002','hash','Diácono','obreiro',1,1,'ativo');
INSERT INTO tipos_culto(id,nome) VALUES(1,'Pregação');
INSERT INTO cultos(id,data,congregacao_id,tipo_culto_id,hora_inicio,hora_fim) VALUES(1,'2026-11-02',1,1,'19:00','21:00');
INSERT INTO escalas(id,culto_id,usuario_id) VALUES(1,1,3);
INSERT INTO compromissos_oficiais(id,usuario_id,congregacao_id,inicio,fim,hora_inicio,hora_fim,descricao,criado_por) VALUES(1,3,1,'2026-11-03','2026-11-03','19:00','21:00','Registro legado',2);
INSERT INTO convites(token,criado_por,area_id,expira_em,perfil) VALUES('link-legado',1,1,'2026-12-31','coordenador');`;
const consulta="SELECT (SELECT COUNT(*) FROM areas) AS areas,(SELECT COUNT(*) FROM congregacoes) AS igrejas,(SELECT COUNT(*) FROM usuarios) AS pessoas,(SELECT COUNT(*) FROM cultos) AS eventos,(SELECT COUNT(*) FROM escalas) AS escalas";
const esperado={areas:1,igrejas:1,pessoas:3,eventos:1,escalas:1};
const local=new DatabaseSync(':memory:');
try{
 local.exec('PRAGMA foreign_keys=ON');local.exec(sql);local.exec(fixture);local.exec(readFileSync('supabase/sqlite/006_simplificacao.sql','utf8'));local.exec(readFileSync('supabase/sqlite/007_foto_perfil.sql','utf8'));local.exec(readFileSync('supabase/sqlite/008_notificacoes.sql','utf8'));
 assert.equal(local.prepare('SELECT publicacao_id FROM escalas WHERE id=1').get().publicacao_id,1);
 assert.equal(local.prepare('SELECT COUNT(*) AS n FROM notificacoes').get().n,0);
 assert.equal(local.prepare('SELECT foto_perfil FROM usuarios WHERE id=3').get().foto_perfil,null);
 assert.equal(local.prepare('SELECT foto_versao FROM usuarios WHERE id=3').get().foto_versao,0);
 assert.deepEqual({...local.prepare(consulta).get()},esperado);
 assert.equal(local.prepare('SELECT COUNT(*) AS n FROM compromissos_legados').get().n,1);
 assert.equal(local.prepare('SELECT pode_definir_area FROM usuarios WHERE id=2').get().pode_definir_area,0);
 assert.equal(local.prepare('SELECT area_id FROM usuarios WHERE id=1').get().area_id,null);
 assert.equal(local.prepare('SELECT revogado FROM convites').get().revogado,1);
 local.prepare("INSERT INTO convites(token,criado_por,area_id,expira_em,max_uses,perfil) VALUES('novo',1,NULL,NULL,NULL,'coordenador')").run();
 assert.equal(local.prepare('PRAGMA quick_check').get().quick_check,'ok');
}finally{local.close();}
const pg=new PGlite();
try{
 await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
 const files=readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort();
 for(const f of files.slice(0,5))await pg.exec(readFileSync('supabase/migrations/'+f,'utf8'));
 await pg.exec(fixture);for(const f of files.slice(5))await pg.exec(readFileSync('supabase/migrations/'+f,'utf8'));
 assert.equal((await pg.query('SELECT publicacao_id FROM escalas WHERE id=1')).rows[0].publicacao_id,1);
 assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM notificacoes')).rows[0].n,0);
 assert.equal((await pg.query('SELECT foto_perfil FROM usuarios WHERE id=3')).rows[0].foto_perfil,null);
 assert.equal((await pg.query('SELECT foto_versao FROM usuarios WHERE id=3')).rows[0].foto_versao,0);
 assert.deepEqual((await pg.query(consulta)).rows[0],esperado);
 assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM compromissos_legados')).rows[0].n,1);
 assert.equal((await pg.query('SELECT pode_definir_area FROM usuarios WHERE id=2')).rows[0].pode_definir_area,0);
 assert.equal((await pg.query('SELECT area_id FROM usuarios WHERE id=1')).rows[0].area_id,null);
 assert.equal((await pg.query('SELECT revogado FROM convites')).rows[0].revogado,1);
}finally{await pg.close();}
console.log('Upgrade SQLite/PostgreSQL validado: pessoas, igrejas, eventos, escalas e registros legados preservados; admin sem área; convites anteriores revogados; contas antigas sem permissão de redefinir a área.');
