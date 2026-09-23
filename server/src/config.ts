// All settings come from the environment (ADR-001). No config file holds values.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * The port Frank listens on.
 *
 * 3000 is not an arbitrary default: it must agree with `ENV PORT=3000` in the
 * root Dockerfile and `--target-port 3000` in .github/workflows/deploy.yml.
 * Change one and the container passes its build and fails its probe.
 */
export const DEFAULT_PORT = 3000;

export function readPort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535; received ${JSON.stringify(raw)}`);
  }
  return port;
}

// Resolved from this module, so it works from both src/ (dev) and dist/ (image):
// dist/config.js -> /app/package.json, src/config.ts -> server/package.json.
const packageRoot = new URL('../', import.meta.url);

function readVersion(): string {
  const pkg: unknown = JSON.parse(readFileSync(new URL('package.json', packageRoot), 'utf8'));
  if (typeof pkg === 'object' && pkg !== null && 'version' in pkg && typeof pkg.version === 'string') {
    return pkg.version;
  }
  throw new Error('package.json has no string "version"');
}

export const config = {
  port: readPort(process.env.PORT),
  version: readVersion(),
  /** The built console, when there is one. The Dockerfile copies ui/dist here. */
  publicDir: fileURLToPath(new URL('public/', packageRoot)),
} as const;
