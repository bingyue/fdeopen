import { describe, it, expect } from 'vitest';
import { readJson, readBody } from '../src/lib/http';
const jsonRequest = (body: string) =>
  new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
describe('bounded JSON requests', () => {
  it.each(['null', '[]', 'true', '42', '"text"', '{broken'])(
    'rejects malformed or non-object payload %s with 400',
    async (value) => {
      await expect(readJson(jsonRequest(value))).rejects.toMatchObject({ status: 400 });
    },
  );
  it('accepts unicode and JSON with charset', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: '{"title":"中文"}',
    });
    expect(await readJson(req)).toEqual({ title: '中文' });
  });
  it('rejects unsupported media types', async () => {
    await expect(
      readJson(new Request('http://localhost', { method: 'POST', body: '{}' })),
    ).rejects.toMatchObject({ status: 415 });
  });
  it('stops reading and cancels an oversized chunked body without Content-Length', async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(64));
      },
      cancel() {
        cancelled = true;
      },
    });
    const req = new Request('http://localhost', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit);
    await expect(readBody(req, 100)).rejects.toMatchObject({ status: 413 });
    expect(cancelled).toBe(true);
  });
  it('decodes UTF-8 correctly across chunks and enforces bytes, not characters', async () => {
    const bytes = new TextEncoder().encode('中文');
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(bytes.slice(0, 2));
        c.enqueue(bytes.slice(2));
        c.close();
      },
    });
    expect(
      await readBody(
        new Request('http://localhost', {
          method: 'POST',
          body: stream,
          duplex: 'half',
        } as RequestInit),
        6,
      ),
    ).toBe('中文');
    await expect(readBody(jsonRequest('中文'), 5)).rejects.toMatchObject({ status: 413 });
  });
});
