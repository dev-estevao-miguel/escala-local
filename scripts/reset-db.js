// Reinício local preserva uma cópia; não altera Supabase ou o banco legado.
import {existsSync,mkdirSync,renameSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
for(const p of ['.env.local','.env'])if(existsSync(p))process.loadEnvFile(p);
if(process.env.DATABASE_URL)throw new Error('Este comando é exclusivo do SQLite local.');
const pasta=resolve(process.env.DATA_DIR||'data'),backup=join(pasta,'backup-'+Date.now());
mkdirSync(backup,{recursive:true});
for(const sufixo of ['','-wal','-shm']){
 const origem=join(pasta,'demo-local-v1.19.db'+sufixo),destino=join(backup,'demo-local-v1.19.db'+sufixo);
 if(!origem.startsWith(pasta+sep)||!destino.startsWith(backup+sep))throw new Error('Caminho de backup inválido.');
 if(existsSync(origem))renameSync(origem,destino);
}
console.log('Cópia local preservada em '+backup+'. Inicie npm run dev para criar uma base vazia.');
