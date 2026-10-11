import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { isDemo, assertConfig } from './config';
export type DB = {
  query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
  transaction: <T>(fn: (tx: DB) => Promise<T>) => Promise<T>;
};
function liteAdapter(pg: PGlite): DB {
  return {
    query: async <T>(sql: string, params: unknown[] = []) => (await pg.query<T>(sql, params)).rows,
    transaction: async <T>(fn: (db: DB) => Promise<T>) =>
      pg.transaction((tx) =>
        fn({
          query: async <R>(s: string, p: unknown[] = []) => (await tx.query<R>(s, p)).rows,
          transaction: async () => {
            throw new Error('Nested transaction not supported');
          },
        }),
      ),
  };
}
function postgresAdapter(sql: ReturnType<typeof postgres>): DB {
  return {
    query: async <T>(s: string, p: unknown[] = []) =>
      (await sql.unsafe(s, p as never[])) as unknown as T[],
    transaction: async <T>(fn: (db: DB) => Promise<T>) =>
      (await sql.begin((tx) =>
        fn(postgresAdapter(tx as unknown as ReturnType<typeof postgres>)),
      )) as T,
  };
}
const globalDb = globalThis as unknown as { fdeDb?: Promise<DB> };
export async function migrate(db: DB, rls = false) {
  await db.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  for (const file of [
    '001_core.sql',
    ...(rls ? ['002_rls.sql'] : []),
    '003_query_indexes.sql',
    '004_webhook_claims.sql',
  ]) {
    if ((await db.query('SELECT version FROM schema_migrations WHERE version=$1', [file])).length)
      continue;
    const sql = await readFile(path.join(process.cwd(), 'supabase/migrations', file), 'utf8');
    await db.transaction(async (tx) => {
      // Multi-statement migrations are split by semicolon; no procedural blocks are used.
      for (const statement of sql.split(';').filter((s) => s.trim())) await tx.query(statement);
      await tx.query('INSERT INTO schema_migrations(version) VALUES($1)', [file]);
    });
  }
}
export async function db(): Promise<DB> {
  if (!globalDb.fdeDb)
    globalDb.fdeDb = (async () => {
      assertConfig();
      if (isDemo()) {
        const dir = process.env.DEMO_DATA_DIR || '.data/fdeopen';
        if (dir !== 'memory://')
          await mkdir(path.resolve(/* turbopackIgnore: true */ dir), { recursive: true });
        const pg = new PGlite(
          dir === 'memory://' ? undefined : path.resolve(/* turbopackIgnore: true */ dir),
        );
        try {
          const database = liteAdapter(pg);
          await migrate(database);
          const { seed } = await import('./seed');
          await seed(database, true);
          return database;
        } catch (error) {
          await pg.close().catch(() => {});
          throw error;
        }
      }
      return postgresAdapter(
        postgres(process.env.DATABASE_URL!, {
          prepare: false,
          // Service SQL passes JSON text so it works identically with PGlite.
          // postgres.js otherwise JSON.stringify()s the already serialized text again.
          types: {
            jsonb: {
              to: 3802,
              from: [114, 3802],
              serialize: (value: unknown) =>
                typeof value === 'string' ? value : JSON.stringify(value),
              parse: (value: string) => JSON.parse(value),
            },
          },
          max: 5,
          connect_timeout: 15,
          idle_timeout: 20,
        }),
      );
    })().catch((error) => {
      // A transient initialization failure must not poison this process forever.
      globalDb.fdeDb = undefined;
      throw error;
    });
  return globalDb.fdeDb;
}
export { liteAdapter };
