import {existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync} from 'node:crypto';
import pg from 'pg';
import { configuracaoPostgres } from '../src/lib/server/postgres.ts';
for(const p of ['.env.local','.env'])if(existsSync(p))process.loadEnvFile(p);
const senha=process.env.ADMIN_PASSWORD || process.env.ADMIN_SENHA;
if(!senha||senha.length<10)throw new Error('Defina ADMIN_SENHA no .env com ao menos 10 caracteres.');
const sal=randomBytes(16),hash=`${sal.toString('hex')}:${scryptSync(senha,sal,64).toString('hex')}`;
const sql="UPDATE usuarios SET senha_hash=?,trocar_senha=0,credencial_versao=credencial_versao+1 WHERE carteira='900001' AND perfil='admin'";
if(process.env.DATABASE_URL){
 const pool=new pg.Pool({...configuracaoPostgres(),max:1});
 try{const r=await pool.query(sql.replace('?','$1'),[hash]);if(r.rowCount!==1)throw new Error('Administrador não encontrado. Execute npm run db:setup.');}finally{await pool.end();}
}else{
 const db=new DatabaseSync(`${process.env.DATA_DIR||'data'}/demo-local-v1.19.db`);
 try{const colunas=db.prepare('PRAGMA table_info(usuarios)').all();if(!colunas.some(c=>c.name==='credencial_versao'))db.exec('ALTER TABLE usuarios ADD COLUMN credencial_versao INTEGER NOT NULL DEFAULT 0');const r=db.prepare(sql).run(hash);if(r.changes!==1)throw new Error('Administrador não encontrado. Inicie o servidor local primeiro.');}finally{db.close();}
}
console.log('Acesso do administrador atualizado: carteira 900001, senha ADMIN_SENHA do .env. Sessões anteriores encerradas.');
