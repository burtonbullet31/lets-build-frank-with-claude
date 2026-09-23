// Renders a form from a tool's advertised input schema (ADR-003), so a new tool
// appears in the console with no UI work — the payoff of ADR-002's schemas.
import { useMemo, useState } from 'react';
import Box from '@cloudscape-design/components/box';
import Checkbox from '@cloudscape-design/components/checkbox';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import type { JsonSchema, JsonSchemaProperty } from '../frank';

export type FieldValues = Record<string, unknown>;

/** Seed values from the schema's own defaults, so a form starts valid where it can. */
export function initialValues(schema: JsonSchema): FieldValues {
  const values: FieldValues = {};
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    if (property.default !== undefined) values[name] = property.default;
    else if (property.type === 'boolean') values[name] = false;
    else values[name] = '';
  }
  return values;
}

/** Client-side check of the things the schema states plainly. Frank re-validates regardless. */
export function validate(schema: JsonSchema, values: FieldValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const name of schema.required ?? []) {
    const value = values[name];
    if (value === undefined || value === '' || value === null) {
      errors[name] = 'Required.';
    }
  }
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    const value = values[name];
    if (value === '' || value === undefined) continue;
    if ((property.type === 'number' || property.type === 'integer') && Number.isNaN(Number(value))) {
      errors[name] = 'Must be a number.';
    }
    if (property.type === 'integer' && !Number.isInteger(Number(value))) {
      errors[name] = 'Must be a whole number.';
    }
  }
  return errors;
}

/** Drops blanks and coerces to the schema's types, so Frank's strict schema is not tripped by "". */
export function toArguments(schema: JsonSchema, values: FieldValues): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    const value = values[name];
    if (value === '' || value === undefined) continue;
    if (property.type === 'number' || property.type === 'integer') args[name] = Number(value);
    else args[name] = value;
  }
  return args;
}

/** Anything outside the scalar subset above: hand the caller raw JSON rather than pretend. */
function isRenderable(property: JsonSchemaProperty): boolean {
  if (Array.isArray(property.enum)) return true;
  return ['string', 'number', 'integer', 'boolean'].includes(property.type ?? '');
}

export interface SchemaFormProps {
  schema: JsonSchema;
  values: FieldValues;
  errors: Record<string, string>;
  onChange: (values: FieldValues) => void;
}

export default function SchemaForm({ schema, values, errors, onChange }: SchemaFormProps) {
  const entries = useMemo(() => Object.entries(schema.properties ?? {}), [schema]);
  const required = new Set(schema.required ?? []);

  if (entries.length === 0) {
    return <Box color="text-body-secondary">This tool takes no arguments.</Box>;
  }

  const set = (name: string, value: unknown) => onChange({ ...values, [name]: value });

  return (
    <SpaceBetween size="m">
      {entries.map(([name, property]) => {
        const label = required.has(name) ? name : `${name} - optional`;
        const common = { label, description: property.description, errorText: errors[name] };

        if (Array.isArray(property.enum)) {
          const options = property.enum.map((option) => ({ label: String(option), value: String(option) }));
          const selected = options.find((option) => option.value === String(values[name])) ?? null;
          return (
            <FormField key={name} {...common}>
              <Select
                selectedOption={selected}
                options={options}
                onChange={({ detail }) => set(name, detail.selectedOption.value)}
                ariaLabel={name}
              />
            </FormField>
          );
        }

        if (property.type === 'boolean') {
          return (
            <FormField key={name} {...common}>
              <Checkbox checked={values[name] === true} onChange={({ detail }) => set(name, detail.checked)}>
                {name}
              </Checkbox>
            </FormField>
          );
        }

        if (!isRenderable(property)) {
          return (
            <FormField
              key={name}
              {...common}
              constraintText={`No field type for "${property.type ?? 'unknown'}" yet - enter JSON.`}
            >
              <Textarea
                value={String(values[name] ?? '')}
                onChange={({ detail }) => set(name, detail.value)}
                ariaLabel={name}
              />
            </FormField>
          );
        }

        return (
          <FormField key={name} {...common}>
            <Input
              value={String(values[name] ?? '')}
              type={property.type === 'number' || property.type === 'integer' ? 'number' : 'text'}
              onChange={({ detail }) => set(name, detail.value)}
              ariaLabel={name}
            />
          </FormField>
        );
      })}
    </SpaceBetween>
  );
}
