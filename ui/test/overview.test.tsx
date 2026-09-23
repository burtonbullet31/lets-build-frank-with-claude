import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Overview from '../src/pages/Overview';
import type { FrankClient } from '../src/frank';

function stubClient(overrides: Partial<FrankClient> = {}): FrankClient {
  return {
    listTools: vi.fn(async () => []),
    callTool: vi.fn(async () => ({
      isError: false,
      summary: 'Frank 0.1.0 is up, 42s since start.',
      structuredContent: { summary: 'Frank 0.1.0 is up, 42s since start.', version: '0.1.0', uptimeSeconds: 42, greeting: 'Frank here.' },
      text: 'Frank 0.1.0 is up, 42s since start.',
    })),
    ...overrides,
  };
}

describe('Overview', () => {
  it("shows Frank's version, uptime and greeting from get_status", async () => {
    render(<Overview client={stubClient()} />);

    expect(await screen.findByText('0.1.0')).toBeDefined();
    expect(await screen.findByText('42s')).toBeDefined();
    expect(await screen.findByText('Frank here.')).toBeDefined();
    expect(await screen.findByText('Connected')).toBeDefined();
  });

  it('says it cannot reach Frank when the call throws', async () => {
    const client = stubClient({
      callTool: vi.fn(async () => {
        throw new Error('Failed to fetch');
      }),
    });

    render(<Overview client={client} />);

    expect(await screen.findByText('Cannot reach Frank')).toBeDefined();
    expect(await screen.findByText('Failed to fetch')).toBeDefined();
  });
});
