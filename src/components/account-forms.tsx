'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { api } from '@/lib/client-api';

export function AccountLoginForm() {
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, start] = useTransition();
  return (
    <form
      className="stack-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setError('');
        setMessage('');
        start(async () => {
          try {
            await api(register ? 'account-register' : 'account-login', {
              loginName: data.get('loginName'),
              password: data.get('password'),
              name: data.get('name'),
              consent: data.get('consent') === 'on',
            });
            if (register) {
              form.reset();
              setRegister(false);
              setMessage('账号已创建，请使用新账号登录。');
            } else {
              router.push('/dashboard');
              router.refresh();
            }
          } catch (e) {
            setError((e as Error).message);
          }
        });
      }}
    >
      <label>
        账号
        <input
          name="loginName"
          autoComplete="username"
          required
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{2,31}"
          placeholder="3–32 位字母、数字或下划线"
        />
      </label>
      {register && (
        <label>
          显示名称
          <input name="name" required maxLength={60} autoComplete="nickname" />
        </label>
      )}
      <label>
        密码
        <input
          key={String(register)}
          name="password"
          type="password"
          autoComplete={register ? 'new-password' : 'current-password'}
          required
          minLength={register ? 12 : 1}
          maxLength={128}
          placeholder={register ? '至少 12 个字符，建议使用长口令' : '输入密码'}
        />
      </label>
      {register && (
        <label className="checkbox-label">
          <input type="checkbox" name="consent" required />
          我已阅读并同意
          <Link href="/privacy" target="_blank">
            隐私与社区规则
          </Link>
          及
          <Link href="/terms" target="_blank">
            使用条款
          </Link>
        </label>
      )}
      <Button disabled={busy} type="submit">
        {busy ? '正在处理…' : register ? '创建账号' : '登录'}
      </Button>
      <Button
        disabled={busy}
        variant="ghost"
        type="button"
        onClick={() => {
          setRegister(!register);
          setError('');
          setMessage('');
        }}
      >
        {register ? '已有账号，返回登录' : '还没有账号？注册'}
      </Button>
      {message && (
        <p className="feedback" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}
      <p className="login-note">
        忘记密码时，请通过<Link href="/contribute">投稿合作入口</Link>联系管理员核验账号归属。
      </p>
    </form>
  );
}

export function PasswordForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, start] = useTransition();
  return (
    <section className="item-panel">
      <h2>账号安全</h2>
      <p>修改密码后，所有设备上的登录状态都会退出。</p>
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setError('');
          if (data.get('password') !== data.get('confirmation')) {
            setError('两次输入的密码不一致');
            return;
          }
          start(async () => {
            try {
              await api('account-password', {
                currentPassword: data.get('currentPassword'),
                password: data.get('password'),
              });
              router.replace('/login');
              router.refresh();
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
            required
            autoComplete="current-password"
            maxLength={128}
          />
        </label>
        <label>
          新密码
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
          />
        </label>
        <label>
          确认新密码
          <input
            name="confirmation"
            type="password"
            required
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
          />
        </label>
        <Button disabled={busy} type="submit">
          修改密码并退出登录
        </Button>
        {error && (
          <p className="feedback error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
