import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { startFrank, type RunningFrank } from './helpers.js';

describe('the HTTP surface (ADR-001)', () => {
  let frank: RunningFrank;
  beforeAll(async () => {
    frank = await startFrank({ publicDir: fileURLToPath(new URL('./does-not-exist/', import.meta.url)) });
  });
  afterAll(() => frank.close());

  it('answers GET /healthz with 200', async () => {
    const res = await fetch(`${frank.baseUrl}/healthz`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ status: 'ok' });
  });

  it('says so at / when no console was built into the image', async () => {
    const res = await fetch(`${frank.baseUrl}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('without a console');
  });

  it('refuses GET /mcp with a JSON-RPC 405 rather than the console fallback', async () => {
    const res = await fetch(`${frank.baseUrl}/mcp`);
    expect(res.status).toBe(405);
    await expect(res.json()).resolves.toMatchObject({ jsonrpc: '2.0' });
  });
});

describe('a built console is served at / (ADR-006)', () => {
  let frank: RunningFrank;
  beforeAll(async () => {
    frank = await startFrank({ publicDir: fileURLToPath(new URL('./fixtures/console/', import.meta.url)) });
  });
  afterAll(() => frank.close());

  it('serves ui/dist instead of the fallback', async () => {
    const res = await fetch(`${frank.baseUrl}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('built console');
  });

  it('still routes /mcp ahead of the static files', async () => {
    const res = await fetch(`${frank.baseUrl}/mcp`);
    expect(res.status).toBe(405);
  });
});
