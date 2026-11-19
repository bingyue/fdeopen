import { z } from 'zod';
import type { DB } from '@/lib/db';
import { eventNames } from './events';
import { placements } from './config';

export const marketingEventSchema = z
  .object({
    event: z.enum(eventNames),
    path: z
      .string()
      .max(200)
      .regex(/^\/(?:[a-zA-Z0-9_-]+\/?)*$/),
    contentType: z.enum([
      'page',
      'home',
      'book',
      'membership',
      'community',
      'insights',
      'features',
      'cases',
      'research',
      'people',
      'events',
      'project',
      'skill',
    ]),
    articleId: z.union([z.literal(''), z.uuid()]),
    placement: z.string().refine((x) => Object.hasOwn(placements, x), '推广位置无效'),
    utmSource: z
      .string()
      .max(48)
      .regex(/^[a-zA-Z0-9_-]*$/),
    device: z.enum(['mobile', 'desktop']),
  })
  .strict()
  .refine((x) => !/^\/(admin|dashboard|login|auth|api)(\/|$)/.test(x.path), '只记录公开内容页面');

export async function recordMarketingEvent(database: DB, input: unknown) {
  const e = marketingEventSchema.parse(input);
  await database.query(
    `INSERT INTO marketing_metrics(event,path,content_type,article_id,placement,utm_source,device)
    VALUES($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT(day,event,path,content_type,article_id,placement,utm_source,device)
    DO UPDATE SET count=marketing_metrics.count+1`,
    [e.event, e.path, e.contentType, e.articleId, e.placement, e.utmSource, e.device],
  );
}
