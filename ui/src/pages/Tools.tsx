import { useCallback, useEffect, useState } from 'react';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Form from '@cloudscape-design/components/form';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import type { FrankClient, FrankTool, ToolResult } from '../frank';
import SchemaForm, { initialValues, toArguments, validate, type FieldValues } from '../components/SchemaForm';

export default function Tools({ client }: { client: FrankClient }) {
  const [tools, setTools] = useState<FrankTool[]>([]);
  const [selected, setSelected] = useState<FrankTool | undefined>();
  const [values, setValues] = useState<FieldValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ToolResult | undefined>();
  const [loadError, setLoadError] = useState<string | undefined>();
  const [running, setRunning] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setTools(await client.listTools());
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : String(error));
      }
    })();
  }, [client]);

  const select = useCallback((tool: FrankTool | undefined) => {
    setSelected(tool);
    setValues(tool ? initialValues(tool.inputSchema) : {});
    setErrors({});
    setResult(undefined);
  }, []);

  const run = useCallback(async () => {
    if (!selected) return;
    const found = validate(selected.inputSchema, values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setRunning(true);
    try {
      setResult(await client.callTool(selected.name, toArguments(selected.inputSchema, values)));
    } catch (error) {
      setResult({ isError: true, text: error instanceof Error ? error.message : String(error) });
    } finally {
      setRunning(false);
    }
  }, [client, selected, values]);

  return (
    <SpaceBetween size="l">
      {loadError && (
        <Alert type="error" header="Could not list Frank's tools">
          {loadError}
        </Alert>
      )}

      <Table
        variant="container"
        header={<Header variant="h2" counter={`(${tools.length})`}>Tools</Header>}
        items={tools}
        trackBy="name"
        selectionType="single"
        selectedItems={selected ? [selected] : []}
        onSelectionChange={({ detail }) => select(detail.selectedItems[0])}
        ariaLabels={{
          selectionGroupLabel: 'Tool selection',
          itemSelectionLabel: (_data, row) => row.name,
        }}
        columnDefinitions={[
          { id: 'name', header: 'Name', cell: (tool) => tool.name, isRowHeader: true },
          { id: 'title', header: 'Title', cell: (tool) => tool.title ?? '-' },
          { id: 'description', header: 'Description', cell: (tool) => tool.description ?? '-' },
        ]}
        empty={<Box color="text-body-secondary">Frank has no tools to show.</Box>}
      />

      {selected && (
        <Container header={<Header variant="h2" description={selected.description}>{selected.name}</Header>}>
          <Form
            actions={
              <Button variant="primary" loading={running} onClick={() => void run()}>
                Run
              </Button>
            }
          >
            <SchemaForm
              schema={selected.inputSchema}
              values={values}
              errors={errors}
              onChange={setValues}
            />
          </Form>
        </Container>
      )}

      {result && (
        <Container header={<Header variant="h2">Result</Header>}>
          <SpaceBetween size="s">
            {result.isError ? (
              <Alert type="error" header={`${selected?.name ?? 'Tool'} returned an error`}>
                {result.text}
              </Alert>
            ) : (
              <Box variant="strong">{result.summary}</Box>
            )}
            <Box variant="code">
              <pre style={{ margin: 0, overflowX: 'auto' }}>
                {JSON.stringify(result.structuredContent ?? { text: result.text }, null, 2)}
              </pre>
            </Box>
          </SpaceBetween>
        </Container>
      )}
    </SpaceBetween>
  );
}
