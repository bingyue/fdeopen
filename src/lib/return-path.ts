// Only local navigable pages may be used after authentication.
export function safeReturnPath(value: unknown, fallback = '/dashboard'): string {
  if (
    typeof value !== 'string' ||
    value.length > 2000 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\s%]/.test(value.split('?')[0]) ||
    /[\r\n\\]/.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, 'https://return.invalid');
    if (
      url.origin !== 'https://return.invalid' ||
      /^\/(api|auth|login|recover|welcome)(\/|$)/.test(url.pathname)
    )
      return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
export function loginHref(next: string) {
  return '/login?next=' + encodeURIComponent(safeReturnPath(next));
}
