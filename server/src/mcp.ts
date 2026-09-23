import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from './config.js';
import { toErrorResult } from './tools/define.js';
import { tools } from './tools/index.js';

/**
 * Builds a fresh MCP server with every registered tool.
 *
 * One per request: the HTTP transport is stateless (see app.ts), so nothing is
 * shared between callers and a restart loses nothing.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'frank', version: config.version },
    { capabilities: { tools: {} } },
  );

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async (args: unknown) => {
        try {
          const result = await tool.handler(args as never);
          // ADR-002: a readable summary for models and humans, plus the typed
          // fields for anything that wants to consume the result structurally.
          return {
            content: [{ type: 'text' as const, text: result.summary as string }],
            structuredContent: result,
          };
        } catch (error) {
          return toErrorResult(tool.name, error);
        }
        // The SDK's callback type depends on the schema generic; the registry is
        // deliberately heterogeneous, so the handler is typed at the tool.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
  }

  return server;
}
