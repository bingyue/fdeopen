import { it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { liteAdapter, migrate } from '../src/lib/db';
import { seed, DEMO_MEMBER } from '../src/lib/seed';
it('enforces Supabase RLS: public catalog only; own submissions; no raw profiles or roles', async () => {
  const pg = new PGlite();
  const database = liteAdapter(pg);
  await pg.exec(
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA auth TO anon,authenticated;",
  );
  await migrate(database, true);
  await seed(database, true);
  await database.query(
    "INSERT INTO resources(id,slug,kind,title,summary,category,status) VALUES('22222222-2222-4222-8222-222222222222','secret-draft','project','SECRET','secret','RAG','draft')",
  );
  await database.query(
    "INSERT INTO submissions(id,user_id,kind,title,payload) VALUES('33333333-3333-4333-8333-333333333333',$1,'requirement','PRIVATE','{}')",
    [DEMO_MEMBER],
  );
  await pg.exec('SET ROLE anon');
  expect((await database.query('SELECT * FROM projects')).length).toBe(20);
  expect((await database.query('SELECT * FROM submissions')).length).toBe(0);
  await expect(database.query('SELECT * FROM profiles')).rejects.toThrow();
  await expect(database.query("UPDATE users SET role='admin'")).rejects.toThrow();
  await expect(
    database.query(
      "INSERT INTO resources(id,slug,kind,title,summary,category) VALUES(gen_random_uuid(),'bad','project','bad','bad','RAG')",
    ),
  ).rejects.toThrow();
  await pg.exec('RESET ROLE');
  await pg.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${DEMO_MEMBER}'`);
  expect((await database.query('SELECT * FROM submissions')).length).toBe(1);
  await pg.exec("SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000002'");
  expect((await database.query('SELECT * FROM submissions')).length).toBe(0);
  await pg.exec('RESET ROLE');
  await pg.close();
});
