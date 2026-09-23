// ADR-002 as an executable gate. The tool-conventions agent is a second
// opinion; this is the one that blocks a merge.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { TOOL_NAME_PATTERN, TOOL_VERBS, baseOutputSchema, defineTool } from '../src/tools/define.js';
import { tools } from '../src/tools/index.js';

describe('every registered tool obeys ADR-002', () => {
  it('registers at least get_status', () => {
    expect(tools.map((t) => t.name)).toContain('get_status');
  });

  it.each(tools.map((tool) => [tool.name, tool] as const))('%s', (name, tool) => {
    expect(name).toMatch(TOOL_NAME_PATTERN);
    expect(TOOL_VERBS).toContain(name.split('_')[0]);

    // Written for a model deciding whether to call it.
    expect(tool.description.trim().length).toBeGreaterThan(40);

    // Inputs: zod, strict, every parameter described.
    expect(tool.inputSchema._def.unknownKeys).toBe('strict');
    for (const [field, schema] of Object.entries(tool.inputSchema.shape)) {
      expect(schema.description, `${name}.${field} needs a description`).toBeTruthy();
    }

    // Outputs: a summary string plus typed detail fields.
    expect(tool.outputSchema.shape).toHaveProperty('summary');
  });
});

describe('get_status states what it returns and what it does not', () => {
  const getStatus = tools.find((t) => t.name === 'get_status');

  it('names its three ADR-002 fields in the output schema', () => {
    expect(Object.keys(getStatus!.outputSchema.shape).sort()).toEqual(
      ['greeting', 'summary', 'uptimeSeconds', 'version'].sort(),
    );
  });

  it('tells a model what it covers and what it does not', () => {
    const description = getStatus!.description.toLowerCase();
    expect(description).toContain('version');
    expect(description).toContain('uptime');
    // ADR-002 asks descriptions to state limits, not just capability.
    expect(description).toMatch(/only|not|nothing/);
  });
});

describe('defineTool refuses out-of-policy tools at load time', () => {
  const ok = {
    title: 'x',
    description: 'A description long enough to be useful to a model choosing a tool.',
    inputSchema: z.object({}).strict(),
    outputSchema: baseOutputSchema,
    handler: () => ({ summary: 'ok' }),
  };

  it.each(['delete_thing', 'create_thing', 'update_thing', 'run_thing'])('rejects %s', (name) => {
    expect(() => defineTool({ ...ok, name })).toThrow(/out of policy/);
  });

  it('rejects a name that is not verb_noun', () => {
    expect(() => defineTool({ ...ok, name: 'status' })).toThrow(/out of policy/);
  });

  it('rejects a non-strict input schema', () => {
    expect(() => defineTool({ ...ok, name: 'get_thing', inputSchema: z.object({}) } as never)).toThrow(
      /strict input schema/,
    );
  });

  it('rejects an undescribed parameter', () => {
    expect(() =>
      defineTool({ ...ok, name: 'get_thing', inputSchema: z.object({ q: z.string() }).strict() }),
    ).toThrow(/needs a description/);
  });

  it('rejects an output schema with no summary', () => {
    expect(() =>
      defineTool({ ...ok, name: 'get_thing', outputSchema: z.object({ other: z.string() }) } as never),
    ).toThrow(/summary/);
  });
});
