import './ambiente';
import { building } from '$app/env';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import pg, { type PoolClient } from 'pg';
import { semear } from './semente';
import { configuracaoPostgres } from './postgres';
import SQL119 from '../../../supabase/sqlite/005_v119.sql?raw';
import SIMPLIFICACAO from '../../../supabase/sqlite/006_simplificacao.sql?raw';
import FOTO_PERFIL from '../../../supabase/sqlite/007_foto_perfil.sql?raw';
import NOTIFICACOES from '../../../supabase/sqlite/008_notificacoes.sql?raw';
pg.types.setTypeParser(20, Number);
pg.types.setTypeParser(1082, s => s);

type Param = string | number | null;
export const bancoRemoto = !!process.env.DATABASE_URL;
const contexto = new AsyncLocalStorage<PoolClient | 'sqlite'>();
const globalDb = globalThis as unknown as { escalaSqlite?: DatabaseSync; escalaPool?: pg.Pool };
let sqlite: DatabaseSync | undefined;
if (!bancoRemoto && !building) {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('Configure DATABASE_URL do Supabase antes de executar em produção.');
  const pasta = process.env.DATA_DIR || join(process.cwd(), 'data');
  mkdirSync(pasta, { recursive: true });
  sqlite = globalDb.escalaSqlite ??= new DatabaseSync(join(pasta, 'demo-local-v1.19.db'));
  sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  sqlite.exec('CREATE TABLE IF NOT EXISTS escala_migrations (nome TEXT PRIMARY KEY, aplicado_em TEXT DEFAULT CURRENT_TIMESTAMP)');
  if(!sqlite.prepare("SELECT nome FROM escala_migrations WHERE nome='005_v119'").get()) {
    sqlite.exec('BEGIN IMMEDIATE');
    try {sqlite.exec(SQL119);sqlite.exec('COMMIT');}
    catch(e){sqlite.exec('ROLLBACK');throw e;}
  }
  semear(sqlite);
  if(!sqlite.prepare("SELECT nome FROM escala_migrations WHERE nome='006_simplificacao'").get()) {
    sqlite.exec('BEGIN IMMEDIATE');
    try {sqlite.exec(SIMPLIFICACAO);sqlite.exec('COMMIT');}
    catch(e){sqlite.exec('ROLLBACK');throw e;}
  }
  if(!sqlite.prepare("SELECT nome FROM escala_migrations WHERE nome='007_foto_perfil'").get()) {
    sqlite.exec('BEGIN IMMEDIATE');
    try {sqlite.exec(FOTO_PERFIL);sqlite.exec('COMMIT');}
    catch(e){sqlite.exec('ROLLBACK');throw e;}
  }
  if(!sqlite.prepare("SELECT nome FROM escala_migrations WHERE nome='008_notificacoes'").get()) {
    sqlite.exec('BEGIN IMMEDIATE');
    try {sqlite.exec(NOTIFICACOES);sqlite.exec('COMMIT');}
    catch(e){sqlite.exec('ROLLBACK');throw e;}
  }
  sqlite.prepare("UPDATE usuarios SET carteira='900001' WHERE carteira='1000' AND perfil='admin'").run();
}
const pool = bancoRemoto ? globalDb.escalaPool ??= new pg.Pool({
  ...configuracaoPostgres(),
  max: 3, idleTimeoutMillis: 20_000, connectionTimeoutMillis: 10_000
}) : undefined;

let fila: Promise<unknown> = Promise.resolve();
async function exclusivo<T>(fn: () => Promise<T>): Promise<T> {
  const anterior = fila;
  let liberar!: () => void;
  fila = new Promise<void>(r => { liberar = r; });
  await anterior;
  try { return await fn(); } finally { liberar(); }
}

export function sqlPostgres(sql: string) {
  let numero = 0;
  return sql
    .replace(/datetime\('now', 'localtime'(?:, '(-?\d+) (minutes?|days?)')?\)/g, (_, n, unidade) =>
      `(to_char(timezone('America/Sao_Paulo', now())${n ? ` + interval '${n} ${unidade}'` : ''}, 'YYYY-MM-DD HH24:MI:SS'))`)
    .replace(/date\('now', 'localtime'\)/g, "to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD')")
    .replace(/'[^']*(?:''[^']*)*'|\?(\s+IS (?:NOT )?NULL)?/gi, (parte, teste) => parte.startsWith('?') ? `$${++numero}${teste ? `::text${teste}` : ''}` : parte);
}

async function consultar<T>(sql: string, params: Param[]): Promise<T[]> {
  if (pool) {
    const conexao = contexto.getStore();
    const resultado = await (conexao && conexao !== 'sqlite' ? conexao : pool).query(sqlPostgres(sql), params);
    return resultado.rows;
  }
  const ler = async () => sqlite!.prepare(sql).all(...params).map(r => ({ ...r }) as T);
  return contexto.getStore() === 'sqlite' ? ler() : exclusivo(ler);
}
export async function todos<T>(sql: string, ...params: Param[]): Promise<T[]> { return consultar<T>(sql, params); }
export async function um<T>(sql: string, ...params: Param[]): Promise<T | undefined> { return (await consultar<T>(sql, params))[0]; }

export async function executar(sql: string, ...params: Param[]) {
  if (pool) {
    const ignorar = /INSERT OR IGNORE/i.test(sql);
    let consulta = sql.replace(/INSERT OR IGNORE/i, 'INSERT');
    if (ignorar) consulta += ' ON CONFLICT DO NOTHING';
    const insercaoId = /^\s*INSERT INTO (usuarios|areas|congregacoes|indisponibilidades|erros|tipos_culto|pontos_pregacao|agenda|cultos|escalas|auditoria|publicacoes_escala|notificacoes)\b/i.test(consulta);
    if (insercaoId) consulta += ' RETURNING id';
    const conexao = contexto.getStore();
    const r = await (conexao && conexao !== 'sqlite' ? conexao : pool).query(sqlPostgres(consulta), params);
    return { alteradas: r.rowCount ?? 0, id: Number(r.rows[0]?.id ?? 0) };
  }
  const gravar = async () => { const r = sqlite!.prepare(sql).run(...params); return { alteradas: Number(r.changes), id: Number(r.lastInsertRowid) }; };
  return contexto.getStore() === 'sqlite' ? gravar() : exclusivo(gravar);
}

export async function transacao<T>(fn: () => T | Promise<T>): Promise<T> {
  if (contexto.getStore()) return fn();
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const resultado = await contexto.run(client, fn);
      await client.query('COMMIT');
      return resultado;
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  }
  return exclusivo(async () => {
    sqlite!.exec('BEGIN IMMEDIATE');
    try { const resultado = await contexto.run('sqlite', fn); sqlite!.exec('COMMIT'); return resultado; }
    catch (e) { sqlite!.exec('ROLLBACK'); throw e; }
  });
}

export async function tamanhoBanco() {
  if (pool) return Number((await pool.query('SELECT pg_database_size(current_database()) AS bytes')).rows[0].bytes) / 1024 / 1024;
  return Number(sqlite!.prepare('PRAGMA page_count').get()!.page_count) * Number(sqlite!.prepare('PRAGMA page_size').get()!.page_size) / 1024 / 1024;
}
export async function verificarBanco() {
  if (pool) { await pool.query('SELECT 1'); return 'Conexão com Supabase/PostgreSQL verificada.'; }
  const resultado = sqlite!.prepare('PRAGMA quick_check').all();
  if (resultado.some(r => r.quick_check !== 'ok')) throw new Error('Falha na integridade do banco local.');
  return 'Banco local íntegro.';
}
