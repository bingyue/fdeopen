'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
import { Button } from './ui/button';
export function WelcomeActions({ next }: { next: string }) {
  const router = useRouter(),
    [busy, start] = useTransition(),
    [error, setError] = useState('');
  function go(path: string) {
    setError('');
    start(async () => {
      try {
        await api('onboarding', {});
        router.replace(path);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }
  return (
    <div>
      <div className="reading-action">
        <Button disabled={busy} onClick={() => go(next)}>
          继续刚才的页面 →
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => go('/start')}>
          查看入门路线
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => go('/dashboard?tab=profile')}>
          完善资料与账号安全
        </Button>
      </div>
      {error && (
        <p role="alert" className="feedback error">
          {error}
        </p>
      )}
    </div>
  );
}
