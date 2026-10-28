import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';
import { configuracaoPostgres } from '../src/lib/server/postgres.ts';


for (const path of ['.env.local', '.env']) if (existsSync(path)) process.loadEnvFile(path);
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL no arquivo .env. Copie a URI em Supabase → Connect → Transaction pooler.');
if (!process.env.SESSAO_SEGREDO) throw new Error('Configure SESSAO_SEGREDO no .env (ao menos 32 caracteres aleatórios).');
if (process.env.SESSAO_SEGREDO.length < 32) throw new Error('SESSAO_SEGREDO deve ter pelo menos 32 caracteres.');
const pool = new pg.Pool({...configuracaoPostgres(), max:1, connectionTimeoutMillis:10000});
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(26123302, 0)');
  await client.query('CREATE TABLE IF NOT EXISTS public.escala_migrations (versao TEXT PRIMARY KEY, aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now())');
  await client.query('ALTER TABLE public.escala_migrations ENABLE ROW LEVEL SECURITY');
  await client.query('REVOKE ALL ON public.escala_migrations FROM anon, authenticated');
  const historicoSupabase=(await client.query("SELECT to_regclass('supabase_migrations.schema_migrations') AS tabela")).rows[0].tabela;
  const versoesSupabase=new Set(historicoSupabase?(await client.query('SELECT version FROM supabase_migrations.schema_migrations')).rows.map(r=>r.version):[]);
  for (const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()) {
    if ((await client.query('SELECT 1 FROM public.escala_migrations WHERE versao=$1',[file])).rowCount) continue;
    if(!versoesSupabase.has(file.split('_')[0])) await client.query(readFileSync(`supabase/migrations/${file}`,'utf8'));
    await client.query('INSERT INTO public.escala_migrations(versao) VALUES ($1)',[file]);
    console.log(`Migração aplicada: ${file}`);
  }
  for(const nome of ['Prega\u00e7\u00e3o','Doutrina','Ora\u00e7\u00e3o','C\u00edrculo de Ora\u00e7\u00e3o','Santa Ceia','Culto para Mocidade','Culto do Proati','Ponto de Prega\u00e7\u00e3o','Festividade de \u00d3rg\u00e3o','Ora\u00e7\u00e3o para Mocidade','Estudos']) await client.query('INSERT INTO tipos_culto(nome) VALUES ($1) ON CONFLICT DO NOTHING',[nome]);
  if (!(await client.query("SELECT 1 FROM usuarios WHERE perfil='admin'")).rowCount) {
    const senha = process.env.ADMIN_PASSWORD || process.env.ADMIN_SENHA;
    if (!senha || senha.length < 10) throw new Error('Defina ADMIN_SENHA no .env com ao menos 10 caracteres para criar o administrador.');
    const sal=randomBytes(16), hash=`${sal.toString('hex')}:${scryptSync(senha,sal,64).toString('hex')}`;
    await client.query(`INSERT INTO usuarios(nome,carteira,senha_hash,cargo,perfil,status) VALUES ('Administrador da plataforma',$2,$1,'','admin','ativo')`,[hash,process.env.ADMIN_LOGIN || '900001']);
    console.log('Administrador criado. Carteira: 900001. Senha: ADMIN_SENHA do .env.');
  }
  await client.query('COMMIT');
  const r=await client.query('SELECT (SELECT COUNT(*) FROM areas)::int AS areas, (SELECT COUNT(*) FROM congregacoes)::int AS congregacoes, (SELECT COUNT(*) FROM agenda)::int AS regras');
  console.log('Supabase pronto:',r.rows[0]);
} catch(e) { await client.query('ROLLBACK'); throw e; }
finally { client.release(); await pool.end(); }
