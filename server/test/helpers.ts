import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createApp, type AppOptions } from '../src/app.js';

export interface RunningFrank {
  baseUrl: string;
  close: () => Promise<void>;
}

/** Boots the real Express app on an ephemeral port. */
export async function startFrank(options: AppOptions = {}): Promise<RunningFrank> {
  const server: Server = createApp(options).listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

/** A real MCP client, so the initialize handshake is genuinely exercised. */
export async function connectClient(baseUrl: string): Promise<Client> {
  const client = new Client({ name: 'frank-test-client', version: '0.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`)));
  return client;
}
