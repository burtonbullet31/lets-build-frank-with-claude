import { describe, expect, it } from 'vitest';
import { initialValues, toArguments, validate } from '../src/components/SchemaForm';
import type { JsonSchema } from '../src/frank';

const schema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: { type: 'string', description: 'What to look up.' },
    limit: { type: 'integer', description: 'How many rows.', default: 10 },
    verbose: { type: 'boolean', description: 'Include detail.' },
  },
};

describe('the schema-driven form (ADR-003)', () => {
  it('seeds values from the schema defaults', () => {
    expect(initialValues(schema)).toEqual({ name: '', limit: 10, verbose: false });
  });

  it('flags a missing required field before Frank is called', () => {
    expect(validate(schema, { name: '', limit: 10 })).toEqual({ name: 'Required.' });
  });

  it('accepts a filled-in form', () => {
    expect(validate(schema, { name: 'rg-frank-class', limit: 10 })).toEqual({});
  });

  it('rejects a non-integer where the schema says integer', () => {
    expect(validate(schema, { name: 'x', limit: '1.5' })).toEqual({ limit: 'Must be a whole number.' });
  });

  it('drops blanks and coerces numbers, so a strict schema is not tripped by ""', () => {
    expect(toArguments(schema, { name: 'x', limit: '25', verbose: '' })).toEqual({ name: 'x', limit: 25 });
  });

  it('sends nothing at all for a no-argument tool like get_status', () => {
    expect(toArguments({ type: 'object', properties: {} }, {})).toEqual({});
  });
});
