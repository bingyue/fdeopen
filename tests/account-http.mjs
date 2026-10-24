import assert from 'node:assert/strict';
const base = process.env.ACCOUNT_TEST_URL;
if (!base || new URL(base).hostname !== '127.0.0.1')
  throw new Error('Only isolated localhost server permitted');
const origin = 'https://fdeopen.test',
  loginName = 'p0-' + Date.now(),
  password = 'only-for-local-test-' + Date.now();
let cookie = '';
async function post(action, data, { auth = true, originHeader = origin } = {}) {
  const response = await fetch(base + '/api/' + action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(originHeader ? { Origin: originHeader } : {}),
      ...(auth && cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(data),
  });
  const body = await response.json();
  return { response, body };
}
assert.equal(
  (
    await post(
      'account-register',
      { loginName, password, name: 'HTTP Test', consent: true },
      { originHeader: '' },
    )
  ).response.status,
  403,
);
const created = await post('account-register', {
  loginName,
  password,
  name: 'HTTP Test',
  consent: true,
});
assert.equal(created.response.status, 201);
assert.match(created.body.recoveryCode, /^[a-f0-9]{48}$/);
assert.match(created.response.headers.get('cache-control'), /no-store/);
const logged = await post('account-login', { loginName, password });
assert.equal(logged.response.status, 200);
assert.equal(logged.body.needsOnboarding, true);
const setCookie = logged.response.headers.get('set-cookie');
assert.match(setCookie, /HttpOnly/i);
assert.match(setCookie, /Secure/i);
assert.match(setCookie, /SameSite=Lax/i);
cookie = setCookie.split(';')[0];
assert.equal((await post('onboarding', {})).response.status, 200);
const profile = await fetch(base + '/dashboard?tab=profile', { headers: { Cookie: cookie } });
assert.equal(profile.status, 200);
assert.match(await profile.text(), /密码找回保障/);
const recovery = await post(
  'account-recover',
  { loginName, recoveryCode: created.body.recoveryCode, password: password + '-new' },
  { auth: false },
);
assert.equal(recovery.response.status, 200);
assert.equal(
  (await post('account-recovery-code', { currentPassword: password })).response.status,
  401,
);
assert.equal(
  (
    await post(
      'account-recover',
      { loginName, recoveryCode: created.body.recoveryCode, password: password + '-again' },
      { auth: false },
    )
  ).response.status,
  401,
);
assert.equal(
  (await post('account-login', { loginName, password }, { auth: false })).response.status,
  401,
);
const next = await post(
  'account-login',
  { loginName, password: password + '-new' },
  { auth: false },
);
assert.equal(next.response.status, 200);
assert.equal(next.body.needsOnboarding, false);
cookie = next.response.headers.get('set-cookie').split(';')[0];
const code = await post('account-recovery-code', { currentPassword: password + '-new' });
assert.equal(code.response.status, 200);
assert.match(code.body.recoveryCode, /^[a-f0-9]{48}$/);
assert.match(code.response.headers.get('cache-control'), /no-store/);
assert.equal((await post('reading-history', { enabled: false })).response.status, 200);
assert.equal((await post('logout', {})).response.status, 200);
assert.equal((await post('onboarding', {})).response.status, 401);
console.log(
  'PASS: native registration, CSRF, secure sessions, onboarding, one-time recovery, session revocation and private endpoints',
);
