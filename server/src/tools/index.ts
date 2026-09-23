// The tool registry. Adding a tool means adding a module here and nothing else:
// the MCP server and the console both read this list.
import type { AnyToolDefinition } from './define.js';
import { getStatus } from './get_status.js';

export const tools: readonly AnyToolDefinition[] = Object.freeze([getStatus] as AnyToolDefinition[]);

export { getStatus };
