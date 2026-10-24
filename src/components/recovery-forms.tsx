'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { loginHref } from '@/lib/return-path';
import { Button } from './ui/button';
export function RecoveryCodeNotice({
  code,
  onDone,
  label = '已保存，关闭',
}: {
  code: string;
  onDone: () => void;
  label?: string;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <section className="notice recovery-notice" aria-labelledby="recovery-title">
      <h2 id="recovery-title">请保存一次性恢复码</h2>
      <p>
        忘记密码时，可凭账号和此码重设密码。恢复码只展示这一次，请保存到密码管理器，不要发给他人。生成新码后旧码立即失效。
      </p>
      <code className="recovery-code">{code}</code>
      <label className="checkbox-label">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        我已安全保存恢复码
      </label>
      <Button type="button" disabled={!saved} onClick={onDone}>
        {label}
      </Button>
    </section>
  );
}
export function RecoverySetup() {
  const [code, setCode] = useState(''),
    [error, setError] = useState('');
  const [busy, start] = useTransition();
  if (code) return <RecoveryCodeNotice code={code} onDone={() => setCode('')} />;
  return (
    <section className="item-panel">
      <h2>密码找回保障</h2>
      <p>为账号生成一次性恢复码。每次生成都会替换旧码；当前密码修改后需要重新生成。</p>
      <form
        className="stack-form"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const currentPassword = new FormData(form).get('currentPassword');
          setError('');
          start(async () => {
            try {
              const result = await api('account-recovery-code', { currentPassword });
              form.reset();
              setCode(String(result.recoveryCode));
            } catch (e) {
              setError((e as Error).message);
            }
          });
        }}
      >
        <label>
          当前密码
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
        <Button disabled={busy}>生成 / 替换恢复码</Button>
        {error && (
          <p role="alert" className="feedback error">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
export function RecoverForm({ next }: { next: string }) {
  const [done, setDone] = useState(false),
    [error, setError] = useState('');
  const [busy, start] = useTransition();
  if (done)
    return (
      <div className="notice" role="status">
        <p>密码已重设，旧会话和恢复码均已失效。登录后请在账号安全中生成新的恢复码。</p>
        <Link className="text-link" href={loginHref(next)}>
          使用新密码登录 →
        </Link>
      </div>
    );
  return (
    <form
      className="stack-form"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setError('');
        if (data.get('password') !== data.get('confirmation')) {
          setError('两次输入的密码不一致');
          return;
        }
        start(async () => {
          try {
            await api('account-recover', Object.fromEntries(data));
            setDone(true);
          } catch (e) {
            setError((e as Error).message);
          }
        });
      }}
    >
      <label>
        账号
        <input name="loginName" autoComplete="username" required minLength={3} maxLength={32} />
      </label>
      <label>
        一次性恢复码
        <input name="recoveryCode" autoComplete="off" spellCheck={false} required maxLength={128} />
      </label>
      <label>
        新密码
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
        />
      </label>
      <label>
        确认新密码
        <input
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
        />
      </label>
      <Button disabled={busy}>{busy ? '正在重设…' : '重设密码'}</Button>
      {error && (
        <p role="alert" className="feedback error">
          {error}
        </p>
      )}
      <Link href={loginHref(next)}>返回登录</Link>
      <p className="login-note">
        未保存恢复码的已有账号，请通过<Link href="/contribute">投稿合作入口</Link>
        联系管理员核验归属。请勿提交密码或恢复码。
      </p>
    </form>
  );
}
