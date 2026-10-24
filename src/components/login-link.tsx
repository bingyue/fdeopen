'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ComponentProps } from 'react';
import { loginHref } from '@/lib/return-path';
export function LoginLink({ children, ...props }: Omit<ComponentProps<typeof Link>, 'href'>) {
  const path = usePathname(),
    router = useRouter();
  return (
    <Link
      {...props}
      href={loginHref(path)}
      onClick={(e) => {
        if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          router.push(
            loginHref(window.location.pathname + window.location.search + window.location.hash),
          );
        }
      }}
    >
      {children}
    </Link>
  );
}
