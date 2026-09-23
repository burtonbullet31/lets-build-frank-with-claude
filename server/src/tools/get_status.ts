import { z } from 'zod';
import { config } from '../config.js';
import { baseOutputSchema, defineTool } from './define.js';

/** ADR-002's first tool: proves the pipeline, client wiring and console before any Azure work. */
export const getStatus = defineTool({
  name: 'get_status',
  title: "Frank's status",
  description:
    'Returns Frank\'s own version, his uptime in seconds, and a greeting. ' +
    'Use it to confirm a connection to Frank is live and to see which build answered. ' +
    'It reports only on Frank himself — it says nothing about Azure or any other system.',
  inputSchema: z.object({}).strict(),
  outputSchema: baseOutputSchema.extend({
    version: z.string().describe("Frank's package version."),
    uptimeSeconds: z.number().int().nonnegative().describe('Whole seconds since this process started.'),
    greeting: z.string().describe('A greeting from Frank.'),
  }),
  handler: () => {
    const uptimeSeconds = Math.floor(process.uptime());
    const greeting = "Frank here. I'm an MCP server, and I'm listening.";
    return {
      summary: `Frank ${config.version} is up, ${uptimeSeconds}s since start.`,
      version: config.version,
      uptimeSeconds,
      greeting,
    };
  },
});
