// The single place ADR-002's tool contract is enforced.
//
// Every tool goes through defineTool(), so compliance is structural rather than
// something each author has to remember: an out-of-policy verb or a non-strict
// input schema throws at module load, before the server can start.
import { z } from 'zod';

/** ADR-002's closed verb set. `create`, `update`, `delete` and `run` are absent on purpose. */
export const TOOL_VERBS = ['get', 'list', 'search', 'summarize'] as const;

export const TOOL_NAME_PATTERN = new RegExp(`^(${TOOL_VERBS.join('|')})(_[a-z0-9]+)+$`);

/** Every tool returns a model-readable `summary` plus its own typed detail fields. */
export const baseOutputSchema = z.object({
  summary: z.string().min(1).describe('A one-line, human- and model-readable summary of the result.'),
});

export type ToolInputSchema = z.ZodObject<z.ZodRawShape, 'strict'>;
export type ToolOutputSchema = z.ZodObject<z.ZodRawShape>;

export interface ToolDefinition<In extends ToolInputSchema, Out extends ToolOutputSchema> {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: In;
  readonly outputSchema: Out;
  readonly handler: (args: z.infer<In>) => Promise<z.infer<Out>> | z.infer<Out>;
}

export type AnyToolDefinition = ToolDefinition<ToolInputSchema, ToolOutputSchema>;

function isStrict(schema: z.ZodObject<z.ZodRawShape>): boolean {
  return schema._def.unknownKeys === 'strict';
}

export function defineTool<In extends ToolInputSchema, Out extends ToolOutputSchema>(
  definition: ToolDefinition<In, Out>,
): ToolDefinition<In, Out> {
  const { name, description, inputSchema, outputSchema } = definition;

  if (!TOOL_NAME_PATTERN.test(name)) {
    throw new Error(
      `Tool "${name}" is out of policy (ADR-002): names are verb_noun in lower snake_case, ` +
        `and the verb must be one of ${TOOL_VERBS.join(', ')}. ` +
        'A tool that mutates anything needs a new ADR, not a new verb.',
    );
  }

  if (!isStrict(inputSchema)) {
    throw new Error(`Tool "${name}" must declare a strict input schema (ADR-002: unknown fields rejected).`);
  }

  for (const [field, schema] of Object.entries(inputSchema.shape)) {
    if (!schema.description) {
      throw new Error(`Parameter "${field}" of tool "${name}" needs a description (ADR-002).`);
    }
  }

  if (!('summary' in outputSchema.shape)) {
    throw new Error(`Tool "${name}" must return a top-level "summary" string (ADR-002).`);
  }

  if (description.trim().length === 0) {
    throw new Error(`Tool "${name}" needs a description (ADR-002).`);
  }

  return Object.freeze(definition);
}

/**
 * Turns a thrown error into ADR-002's error shape: `isError: true` and a
 * plain-language message. The stack is logged for the operator and never
 * returned to the caller.
 */
export function toErrorResult(toolName: string, error: unknown) {
  console.error(`tool ${toolName} failed`, error);
  const detail = error instanceof Error ? error.message : String(error);
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: `${toolName} could not complete: ${detail}` }],
  };
}
