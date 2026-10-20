'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardBody, CardHeader, Funnel, StatTile, Trend, EmptyState } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { api } from '@/lib/api-client';

interface Dashboard {
  totals: { campaigns: number; running: number; complete: number; groups: number };
  events: { sent: number; opened: number; clicked: number; submitted: number; reported: number };
  overallSuccessRate: number;
  series: { id: string; name: string; successRate: number }[];
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<Dashboard>({ queryKey: ['dashboard'], queryFn: () => api.get<Dashboard>('/reports/dashboard') });

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="How your awareness program is performing."
        actions={<Link href="/campaigns/new"><Button>New campaign</Button></Link>} />
      {isLoading || !data ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Campaigns" value={data.totals.campaigns} />
            <StatTile label="Running" value={data.totals.running} tone="var(--cg-opened)" />
            <StatTile label="Completed" value={data.totals.complete} tone="var(--cg-ok)" />
            <StatTile label="Target groups" value={data.totals.groups} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Exposure funnel" subtitle={`${data.overallSuccessRate}% overall success rate`} />
              <CardBody>
                <Funnel steps={[
                  { label: 'Sent', value: data.events.sent, color: 'var(--cg-sent)' },
                  { label: 'Opened', value: data.events.opened, color: 'var(--cg-opened)' },
                  { label: 'Clicked', value: data.events.clicked, color: 'var(--cg-clicked)' },
                  { label: 'Submitted', value: data.events.submitted, color: 'var(--cg-submitted)' },
                  { label: 'Reported', value: data.events.reported, color: 'var(--cg-reported)' },
                ]} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Success rate trend" subtitle="Recent campaigns, oldest to newest" />
              <CardBody>
                {data.series.length === 0 ? <EmptyState title="No launched campaigns yet" body="Launch a campaign to see the trend." /> : <Trend points={data.series.map((s) => ({ label: s.name, value: s.successRate }))} />}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
