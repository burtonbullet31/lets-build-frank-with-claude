import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tools from '../src/pages/Tools';
import type { FrankClient } from '../src/frank';

const getStatus = {
  name: 'get_status',
  title: "Frank's status",
  description: "Returns Frank's own version, his uptime in seconds, and a greeting.",
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
};

function stubClient(overrides: Partial<FrankClient> = {}): FrankClient {
  return {
    listTools: vi.fn(async () => [getStatus]),
    callTool: vi.fn(async () => ({
      isError: false,
      summary: 'Frank 0.1.0 is up, 42s since start.',
      structuredContent: { summary: 'Frank 0.1.0 is up, 42s since start.', version: '0.1.0' },
      text: 'Frank 0.1.0 is up, 42s since start.',
    })),
    ...overrides,
  };
}

describe('Tools', () => {
  it('lists the tools Frank discovered', async () => {
    render(<Tools client={stubClient()} />);
    expect(await screen.findByText('get_status')).toBeDefined();
    expect(await screen.findByText(/Returns Frank's own version/)).toBeDefined();
  });

  it('renders a form from the schema and shows the result of running the tool', async () => {
    const client = stubClient();
    const user = userEvent.setup();
    render(<Tools client={client} />);

    await user.click(await screen.findByRole('radio'));
    expect(await screen.findByText('This tool takes no arguments.')).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Run' }));

    await waitFor(() => expect(client.callTool).toHaveBeenCalledWith('get_status', {}));
    expect(await screen.findByText('Frank 0.1.0 is up, 42s since start.')).toBeDefined();
  });

  it("surfaces Frank's isError result rather than pretending it worked", async () => {
    const client = stubClient({
      callTool: vi.fn(async () => ({
        isError: true,
        text: "Input validation error: Unrecognized key(s) in object: 'nope'",
      })),
    });
    const user = userEvent.setup();
    render(<Tools client={client} />);

    await user.click(await screen.findByRole('radio'));
    await user.click(screen.getByRole('button', { name: 'Run' }));

    expect(await screen.findByText('get_status returned an error')).toBeDefined();
    expect((await screen.findAllByText(/Unrecognized key/)).length).toBeGreaterThan(0);
  });
});
