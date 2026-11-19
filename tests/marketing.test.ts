import { beforeAll, afterAll, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { liteAdapter, migrate } from '../src/lib/db';
import {
  membership,
  purchaseReady,
  promotionOrder,
  safeHttps,
  book,
} from '../src/lib/marketing/config';
import { membershipStructuredData } from '../src/lib/marketing/seo';
import { recordMarketingEvent, marketingEventSchema } from '../src/lib/marketing/analytics';
const pg = new PGlite(),
  database = liteAdapter(pg);
beforeAll(async () => {
  await migrate(database);
});
afterAll(async () => {
  await pg.close();
});
it('keeps mock memberships unpurchasable and omits unconfirmed offers', () => {
  expect(purchaseReady()).toBe(false);
  expect(membership.price).toBeNull();
  expect(membershipStructuredData()).not.toHaveProperty('offers');
  const live = {
    ...membership,
    mode: 'live' as const,
    benefitsConfirmed: true,
    price: 399,
    purchaseUrl: 'https://example.org/invite',
    memberAccessUrl: 'https://example.org/member',
    refundPolicy: 'Confirmed',
    invoicePolicy: 'Confirmed',
    supportContact: 'Confirmed',
  };
  expect(purchaseReady(live)).toBe(true);
  for (const field of [
    'refundPolicy',
    'invoicePolicy',
    'supportContact',
    'purchaseUrl',
    'memberAccessUrl',
  ] as const)
    expect(purchaseReady({ ...live, [field]: '' })).toBe(false);
  expect(purchaseReady({ ...live, price: NaN })).toBe(false);
  expect(purchaseReady({ ...live, benefitsConfirmed: false })).toBe(false);
  expect(purchaseReady({ ...live, mode: 'preview' })).toBe(false);
  expect(purchaseReady({ ...live, enabled: false })).toBe(false);
  for (const url of [
    'javascript:alert(1)',
    '//evil.example',
    'http://example.org',
    'https://user:password@example.org',
  ])
    expect(safeHttps(url)).toBe(false);
});
it('uses verified publication chapters and prioritizes recommendations by content', () => {
  expect(book.toc).toHaveLength(12);
  expect(book.toc[11].title).toContain('电商、营销与出海');
  expect(promotionOrder('cases')[0]).toBe('community');
  expect(promotionOrder('research')[0]).toBe('book');
  expect(promotionOrder('project')[0]).toBe('awesome');
  expect(promotionOrder('insights', 'FDE职业成长')[0]).toBe('book');
});
const event = {
  event: 'book_purchase_click',
  path: '/book',
  contentType: 'book',
  articleId: '',
  placement: 'book-page',
  utmSource: 'wechat',
  device: 'mobile',
};
it('rejects personal data, unknown events, private routes and unbounded source fields', () => {
  expect(marketingEventSchema.safeParse(event).success).toBe(true);
  for (const changes of [
    { event: 'payment_success' },
    { email: 'reader@example.org' },
    { path: '/book?email=private' },
    { path: '/admin/marketing' },
    { utmSource: 'reader@example.org' },
    { utmSource: 'a'.repeat(49) },
    { placement: 'unknown' },
    { articleId: 'someone-name' },
  ])
    expect(marketingEventSchema.safeParse({ ...event, ...changes }).success).toBe(false);
});
it('aggregates repeated clicks while keeping source and device dimensions distinct', async () => {
  await Promise.all(Array.from({ length: 4 }, () => recordMarketingEvent(database, event)));
  await recordMarketingEvent(database, { ...event, device: 'desktop' });
  await recordMarketingEvent(database, { ...event, utmSource: 'newsletter' });
  const rows = await database.query<{ count: number; device: string; utm_source: string }>(
    'SELECT count,device,utm_source FROM marketing_metrics',
  );
  expect(rows).toHaveLength(3);
  expect(Number(rows.find((x) => x.device === 'mobile' && x.utm_source === 'wechat')?.count)).toBe(
    4,
  );
  const columns = await database.query<{ column_name: string }>(
    "SELECT column_name FROM information_schema.columns WHERE table_name='marketing_metrics'",
  );
  expect(columns.map((x) => x.column_name)).not.toEqual(expect.arrayContaining(['user_id', 'ip']));
});
