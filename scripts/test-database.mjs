import {PGlite} from '@electric-sql/pglite';
import {readdirSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
try{
 await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
 const counts=(await db.query('SELECT (SELECT COUNT(*) FROM areas)::int AS areas,(SELECT COUNT(*) FROM congregacoes)::int AS congregacoes,(SELECT COUNT(*) FROM escalas)::int AS escalas')).rows[0];
 assert.deepEqual(counts,{areas:0,congregacoes:0,escalas:0});
 await db.query("INSERT INTO usuarios(nome,carteira,senha_hash,cargo,perfil,status) VALUES ('Admin','900001','hash','','admin','ativo')");
 await assert.rejects(db.query("INSERT INTO usuarios(nome,carteira,senha_hash,cargo,perfil,status) VALUES ('Outro','900002','hash','','admin','ativo')"),/unique/i);
 await db.exec("INSERT INTO areas(codigo,polo)VALUES('15','Área de teste'),('20','Outra área');INSERT INTO congregacoes(area_id,codigo,nome,habilitada)VALUES(1,'1501','Igreja A',1),(2,'2001','Igreja B',1)");
 for(let i=1;i<=3;i++)await db.query("INSERT INTO usuarios(nome,carteira,senha_hash,cargo,area_id,congregacao_id,status,nascimento)VALUES($1,$2,'hash','Diácono',1,1,'ativo','1985-05-20')",['Teste '+i,'000'+i]);
 await assert.rejects(db.query('UPDATE usuarios SET area_id=2 WHERE carteira=$1',['0001']),/fora da área/);
 await db.query("UPDATE usuarios SET perfil='pb' WHERE carteira='0001'");
 await assert.rejects(db.query("UPDATE usuarios SET perfil='pb' WHERE carteira='0002'"),/unique/i);
 for(const c of ['0001','0002'])await db.query('UPDATE usuarios SET gerencia_escala=1 WHERE carteira=$1',[c]);
 await assert.rejects(db.query("UPDATE usuarios SET gerencia_escala=1 WHERE carteira='0003'"),/Limite de dois/);
 const tipo=(await db.query("SELECT data_type,is_nullable FROM information_schema.columns WHERE table_name='usuarios' AND column_name='nascimento'")).rows[0];
 assert.equal(tipo.data_type,'date');assert.equal(tipo.is_nullable,'YES');
 assert.equal((await db.query("SELECT carteira FROM usuarios WHERE carteira='0001'")).rows[0].carteira,'0001');
 assert.deepEqual((await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity")).rows,[]);
 await db.exec('SET ROLE anon');
 for(const t of ['usuarios','convites','auditoria','compromissos_legados','areas','notificacoes','publicacoes_escala'])await assert.rejects(db.query(`SELECT * FROM ${t}`),/permission denied/);
 await db.exec('RESET ROLE');
 console.log('PostgreSQL: 8 migrações válidas; base vazia; admin único; DATE; carteira com zeros; isolamento; responsável único; limite de 2 delegados; RLS, notificações e bloqueio público.');
}finally{await db.close();}
