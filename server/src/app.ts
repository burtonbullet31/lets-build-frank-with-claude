import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express, { type Express, type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from './config.js';
import { createMcpServer } from './mcp.js';

/** JSON-RPC error for the methods the stateless transport does not serve. */
function methodNotAllowed(_req: Request, res: Response): void {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Frank speaks MCP over POST /mcp only.' },
    id: null,
  });
}

export interface AppOptions {
  /** Where the built console lives. Defaults to the directory the Dockerfile copies ui/dist into. */
  publicDir?: string;
}

export function createApp(options: AppOptions = {}): Express {
  const publicDir = options.publicDir ?? config.publicDir;
  const app = express();

  // Health first, and deliberately trivial: it must answer while Frank is
  // otherwise busy. Matches the Dockerfile HEALTHCHECK and ADR-004's probe.
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', version: config.version, uptimeSeconds: Math.floor(process.uptime()) });
  });

  // MCP over Streamable HTTP (ADR-001). Stateless: a fresh server and transport
  // per request, closed when the response is. Nothing to resume after the
  // container scales to zero, and no session state to get out of step.
  app.post('/mcp', express.json(), async (req, res) => {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('POST /mcp failed', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Frank could not handle that request.' },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  // The console is optional (ADR-003, ADR-006): it is built late in the class,
  // and Frank serves MCP long before it exists. If ui/dist was empty at image
  // build time, static finds nothing and the fallback below explains itself
  // instead of returning a 404 that looks like a broken deploy.
  app.use(express.static(publicDir));

  app.get('/', (_req, res) => {
    res
      .status(200)
      .type('html')
      .send(
        [
          '<!doctype html><meta charset="utf-8"><title>Frank</title>',
          '<h1>Frank is running, without a console.</h1>',
          '<p>The Cloudscape console (ADR-003) has not been built into this image yet.</p>',
          '<ul>',
          '<li>MCP endpoint: <code>POST /mcp</code></li>',
          '<li>Health: <a href="/healthz"><code>/healthz</code></a></li>',
          '</ul>',
        ].join('\n'),
      );
  });

  return app;
}

/** True when this image actually carries a built console. */
export function hasConsole(publicDir: string = config.publicDir): boolean {
  return existsSync(join(publicDir, 'index.html'));
}
