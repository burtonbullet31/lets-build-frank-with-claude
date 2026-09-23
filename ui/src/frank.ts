// The console's only way of talking to Frank.
//
// ADR-006 replaced ADR-003's build-time VITE_FRANK_URL and CORS allowlist:
// Frank serves this bundle himself, so /mcp is same-origin and relative. In
// dev, Vite proxies /mcp to a locally running Frank (see vite.config.ts).
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/** The JSON Schema subset the console renders a form from. */
export interface JsonSchemaProperty {
  type?: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface FrankTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema: JsonSchema;
}

export interface ToolResult {
  isError: boolean;
  /** ADR-002's top-level summary, when the call succeeded. */
  summary?: string;
  /** The typed detail fields, or the error text. */
  structuredContent?: Record<string, unknown>;
  text: string;
}

export interface FrankClient {
  listTools(): Promise<FrankTool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
}

function textOf(content: unknown): string {
  if (!Array.isArray(content)) return '';
  return content
    .filter((part): part is { type: 'text'; text: string } =>
      typeof part === 'object' && part !== null && (part as { type?: string }).type === 'text',
    )
    .map((part) => part.text)
    .join('\n');
}

export function createFrankClient(): FrankClient {
  let connecting: Promise<Client> | undefined;

  const connect = (): Promise<Client> => {
    connecting ??= (async () => {
      const client = new Client({ name: 'frank-console', version: '0.1.0' });
      await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', window.location.origin)));
      return client;
    })().catch((error: unknown) => {
      connecting = undefined; // let the next attempt retry rather than cache a failure
      throw error;
    });
    return connecting;
  };

  return {
    async listTools() {
      const client = await connect();
      const { tools } = await client.listTools();
      return tools.map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: (tool.inputSchema ?? { type: 'object' }) as JsonSchema,
      }));
    },

    async callTool(name, args) {
      const client = await connect();
      const result = await client.callTool({ name, arguments: args });
      const structuredContent = result.structuredContent as Record<string, unknown> | undefined;
      const summary = typeof structuredContent?.summary === 'string' ? structuredContent.summary : undefined;
      return {
        isError: result.isError === true,
        summary,
        structuredContent,
        text: textOf(result.content),
      };
    },
  };
}
