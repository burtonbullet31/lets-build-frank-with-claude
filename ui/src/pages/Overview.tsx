import { useCallback, useEffect, useState } from 'react';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Spinner from '@cloudscape-design/components/spinner';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import type { FrankClient } from '../frank';

type State =
  | { kind: 'loading' }
  | { kind: 'connected'; version: string; uptimeSeconds: number; greeting: string; summary: string }
  | { kind: 'failed'; message: string };

export default function Overview({ client }: { client: FrankClient }) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const result = await client.callTool('get_status', {});
      if (result.isError) {
        setState({ kind: 'failed', message: result.text });
        return;
      }
      const details = result.structuredContent ?? {};
      setState({
        kind: 'connected',
        summary: result.summary ?? '',
        version: String(details.version ?? 'unknown'),
        uptimeSeconds: Number(details.uptimeSeconds ?? 0),
        greeting: String(details.greeting ?? ''),
      });
    } catch (error) {
      setState({ kind: 'failed', message: error instanceof Error ? error.message : String(error) });
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="Frank's own get_status output, and whether this console can reach him."
          actions={<Button onClick={() => void load()}>Refresh</Button>}
        >
          Overview
        </Header>
      }
    >
      {state.kind === 'loading' && (
        <Box>
          <Spinner /> Asking Frank for his status...
        </Box>
      )}

      {state.kind === 'failed' && (
        <Alert type="error" header="Cannot reach Frank">
          {state.message}
        </Alert>
      )}

      {state.kind === 'connected' && (
        <SpaceBetween size="l">
          <KeyValuePairs
            columns={4}
            items={[
              { label: 'Connection', value: <StatusIndicator type="success">Connected</StatusIndicator> },
              { label: 'Version', value: state.version },
              { label: 'Uptime', value: `${state.uptimeSeconds}s` },
              { label: 'Greeting', value: state.greeting },
            ]}
          />
          <Box color="text-body-secondary">{state.summary}</Box>
        </SpaceBetween>
      )}
    </Container>
  );
}
