import { describe, expect, it } from 'vitest';
import { DEFAULT_PORT, config, readPort } from '../src/config.js';

describe('config (ADR-001: env only)', () => {
  it('defaults PORT to 3000, the value the Dockerfile and deploy.yml agree on', () => {
    expect(DEFAULT_PORT).toBe(3000);
    expect(readPort(undefined)).toBe(3000);
    expect(readPort('')).toBe(3000);
  });

  it('accepts a valid port', () => {
    expect(readPort('8080')).toBe(8080);
  });

  it.each(['0', '-1', '70000', 'three thousand', '3000.5'])('rejects %s', (raw) => {
    expect(() => readPort(raw)).toThrow(/PORT must be an integer/);
  });

  it('reads its version from package.json', () => {
    expect(config.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
