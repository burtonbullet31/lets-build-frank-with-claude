import { useMemo, useState } from 'react';
import AppLayout from '@cloudscape-design/components/app-layout';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import { createFrankClient, type FrankClient } from './frank';
import Overview from './pages/Overview';
import Tools from './pages/Tools';

// Two pages and no router: a client-side router would add a catch-all route for
// no gain here, and ADR-003 asks for exactly these two.
const PAGES = ['overview', 'tools'] as const;
type Page = (typeof PAGES)[number];

export default function App({ client }: { client?: FrankClient }) {
  const frank = useMemo(() => client ?? createFrankClient(), [client]);
  const [page, setPage] = useState<Page>('overview');

  return (
    <AppLayout
      contentType="default"
      toolsHide
      navigation={
        <SideNavigation
          header={{ text: 'Frank', href: '#overview' }}
          activeHref={`#${page}`}
          onFollow={(event) => {
            event.preventDefault();
            const next = event.detail.href.replace('#', '') as Page;
            if (PAGES.includes(next)) setPage(next);
          }}
          items={[
            { type: 'link', text: 'Overview', href: '#overview' },
            { type: 'link', text: 'Tools', href: '#tools' },
          ]}
        />
      }
      content={
        <ContentLayout
          header={
            <Header variant="h1" description="An MCP server you can talk to without an AI client.">
              Frank
            </Header>
          }
        >
          {page === 'overview' ? <Overview client={frank} /> : <Tools client={frank} />}
        </ContentLayout>
      }
    />
  );
}
