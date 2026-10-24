import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  !['127.0.0.1', 'localhost'].includes(new URL(url).hostname) ||
  new URL(url).pathname !== '/fdeopen_test'
)
  throw new Error('Only an isolated local fdeopen_test database is allowed.');
process.env.APP_MODE = 'supabase';
process.env.DATABASE_URL = url;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://local-test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'local-integration-placeholder';
const { db, migrate } = await import('../src/lib/db');
const { seed } = await import('../src/lib/seed');
const service = await import('../src/lib/service');
const { getResource, relatedResources } = await import('../src/lib/catalog');
const database = await db();
await database.query('CREATE ROLE anon');
await database.query('CREATE ROLE authenticated');
await database.query('CREATE SCHEMA auth');
await database.query(
  "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$",
);
await database.query('GRANT USAGE ON SCHEMA auth TO anon,authenticated');
await migrate(database, true);
await seed(database, false);
await seed(database, false);
assert.equal(
  (await database.query('SELECT * FROM users')).length,
  0,
  'Production seed must not create demo users',
);
const memberId = randomUUID(),
  adminId = randomUUID();
for (const [id, role] of [
  [memberId, 'member'],
  [adminId, 'admin'],
]) {
  await database.query('INSERT INTO users(id,role) VALUES($1,$2)', [id, role]);
  await database.query('INSERT INTO profiles(user_id,handle,name) VALUES($1,$2,$2)', [id, role]);
}
const member = (
  await database.query<import('../src/lib/types').User>(
    'SELECT u.*,p.* FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1',
    [memberId],
  )
)[0];
const admin = (
  await database.query<import('../src/lib/types').User>(
    'SELECT u.*,p.* FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1',
    [adminId],
  )
)[0];
const submission = await service.submit(member, {
  kind: 'project',
  title: 'PostgreSQL 真实集成项目',
  summary: '验证原生 PostgreSQL 驱动、事务、审核状态与内容发布流程。',
  category: 'Agent',
  sourceUrl: 'https://github.com/test/postgres',
});
const published = await service.reviewSubmission(
  admin,
  submission.id,
  'approved',
  '原生 PostgreSQL 审核通过',
);
assert(published.resourceId);
const privateReq = await service.submit(member, {
  kind: 'requirement',
  title: '数据库私密需求测试',
  summary: '这是不会被匿名访问读取的私密企业需求原始描述。',
  category: '企业管理',
  contact: 'private-test@example.com',
});
assert(privateReq.id);
const task = await getResource('first-deployment');
assert(task);
const application = await service.applyTask(
  member,
  task.id,
  '通过原生 PostgreSQL 驱动验证共创状态转换与贡献事务。',
);
await service.reviewApplication(admin, application.id, 'accepted', 'accepted');
await service.submitPr(member, application.id, 'https://github.com/test/postgres/pull/1');
await service.reviewApplication(admin, application.id, 'completed', 'completed');
assert.equal((await database.query('SELECT * FROM contributions')).length, 1);
await service.toggle(member, published.resourceId, 'bookmark');
assert.equal((await database.query('SELECT * FROM bookmarks')).length, 1);
assert((await relatedResources(task.id)).length > 0);
// Real PostgreSQL transactions must serialize operations across pool connections.
const concurrent = {
  kind: 'scenario',
  title: 'PostgreSQL 并发投稿',
  summary: '同一个用户的并发投稿应只产生一条待审核记录。',
  category: '测试',
};
const duplicateResults = await Promise.allSettled([
  service.submit(member, concurrent),
  service.submit(member, concurrent),
]);
assert.equal(duplicateResults.filter((r) => r.status === 'fulfilled').length, 1);
await Promise.all([
  service.toggle(member, published.resourceId, 'like'),
  service.toggle(member, published.resourceId, 'like'),
]);
assert.equal(
  (
    await database.query('SELECT * FROM likes WHERE user_id=$1 AND resource_id=$2', [
      memberId,
      published.resourceId,
    ])
  ).length,
  0,
);
await migrate(database, true);
assert.equal((await database.query('SELECT * FROM schema_migrations')).length, 9);

await database.transaction(async (tx) => {
  await tx.query('SET LOCAL ROLE anon');
  assert.equal((await tx.query('SELECT * FROM projects')).length, 21);
  assert.equal((await tx.query('SELECT * FROM submissions')).length, 0);
});
await assert.rejects(
  database.transaction(async (tx) => {
    await tx.query('SET LOCAL ROLE anon');
    await tx.query('SELECT * FROM profiles');
  }),
);
await database.transaction(async (tx) => {
  await tx.query('SET LOCAL ROLE authenticated');
  await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [memberId]);
  assert.equal((await tx.query('SELECT * FROM submissions')).length, 3);
});
await database.transaction(async (tx) => {
  await tx.query('SET LOCAL ROLE authenticated');
  await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [adminId]);
  assert.equal((await tx.query('SELECT * FROM submissions')).length, 0);
});
const { createAccount, loginAccount, changePassword } = await import('../src/lib/accounts');
const accountId = await createAccount(database, {
  loginName: 'postgres-account-test',
  name: 'Account regression',
  password: 'postgres-account-long-passphrase',
  consent: true,
  role: 'admin',
});
assert.equal(
  (await database.query<{ role: string }>('SELECT role FROM users WHERE id=$1', [accountId]))[0]
    .role,
  'member',
);
const accountSession = await loginAccount(database, {
  loginName: 'POSTGRES-ACCOUNT-TEST',
  password: 'postgres-account-long-passphrase',
});
assert.equal(accountSession.userId, accountId);
await changePassword(database, accountId, {
  currentPassword: 'postgres-account-long-passphrase',
  password: 'postgres-account-replaced-passphrase',
});
assert.equal(
  (await database.query('SELECT token_hash FROM sessions WHERE user_id=$1', [accountId])).length,
  0,
);
await assert.rejects(
  loginAccount(database, {
    loginName: 'postgres-account-test',
    password: 'postgres-account-long-passphrase',
  }),
);
await assert.rejects(
  database.transaction(async (tx) => {
    await tx.query('SET LOCAL ROLE anon');
    await tx.query('SELECT password_hash FROM account_credentials');
  }),
);
const result = {
  checkedAt: new Date().toISOString(),
  engine: (await database.query<{ version: string }>('SELECT version()'))[0].version,
  migrations: (await database.query('SELECT * FROM schema_migrations')).length,
  concurrentDuplicateSubmission: true,
  concurrentToggleSerialization: true,
  idempotentMigration: true,
  productionSeedHasDemoUsers: false,
  submissionTransaction: true,
  taskContributionTransaction: true,
  bookmarkPersistence: true,
  rlsAnonIsolation: true,
  rlsOwnSubmissions: true,
  localAccountPasswordAndSessionRevocation: true,
  passwordTableDeniedToAnon: true,
};
await writeFile('docs/postgres-integration.json', JSON.stringify(result, null, 2));
console.log(result);
process.exit(0);
