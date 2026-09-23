// Drives Frank with a real MCP client, so the initialize handshake, the
// Accept-header negotiation and the SSE response framing are all genuinely
// exercised rather than approximated with a hand-built POST.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { connectClient, startFrank, type RunningFrank } from './helpers.js';

describe('MCP over Streamable HTTP', () => {
  let frank: RunningFrank;
  let client: Client;

  beforeAll(async () => {
    frank = await startFrank();
    client = await connectClient(frank.baseUrl);
  });

  afterAll(async () => {
    await client.close();
    await frank.close();
  });

  it('completes the initialize handshake and reports itself as frank', () => {
    expect(client.getServerVersion()).toMatchObject({ name: 'frank' });
  });

  it('lists get_status with a description and an input schema', async () => {
    const { tools } = await client.listTools();
    const getStatus = tools.find((t) => t.name === 'get_status');

    expect(getStatus).toBeDefined();
    expect(getStatus!.description).toBeTruthy();
    expect(getStatus!.inputSchema).toMatchObject({ type: 'object' });
  });

  it('advertises that unknown arguments are rejected, so the console can say so too', async () => {
    const { tools } = await client.listTools();
    const getStatus = tools.find((t) => t.name === 'get_status');
    expect(getStatus!.inputSchema.additionalProperties).toBe(false);
  });

  it('returns a summary and the ADR-002 typed fields from get_status', async () => {
    const result = await client.callTool({ name: 'get_status', arguments: {} });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
      uptimeSeconds: expect.any(Number),
      greeting: expect.any(String),
    });
    expect((result.structuredContent as { summary: string }).summary).toContain('Frank');

    const [first] = result.content as Array<{ type: string; text: string }>;
    expect(first).toMatchObject({ type: 'text' });
    expect(first!.text).toBe((result.structuredContent as { summary: string }).summary);
  });

  it('rejects an unknown argument instead of silently ignoring it', async () => {
    const result = await client.callTool({
      name: 'get_status',
      arguments: { resourceGroup: 'somebody-elses' },
    });

    // ADR-002: isError plus a plain-language message. A strict schema is what
    // makes this a rejection rather than a silently stripped field.
    expect(result.isError).toBe(true);
    const [first] = result.content as Array<{ text: string }>;
    expect(first!.text).toMatch(/Unrecognized key/);
    expect(first!.text).toContain('resourceGroup');
    expect(first!.text).not.toMatch(/\s+at\s+.+:\d+:\d+/);
  });

  it('reports an unknown tool in plain language, with no stack trace', async () => {
    const result = await client.callTool({ name: 'delete_everything', arguments: {} });

    expect(result.isError).toBe(true);
    const [first] = result.content as Array<{ text: string }>;
    expect(first!.text).toMatch(/not found/i);
    expect(first!.text).not.toMatch(/\s+at\s+.+:\d+:\d+/);
  });
});
