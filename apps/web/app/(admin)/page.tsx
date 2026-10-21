'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardBody, CardHeader, Funnel, StatTile, Trend, EmptyState, Badge, statusTone } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { api } from '@/lib/api-client';
import { useCountUp } from '@/lib/use-count-up';

interface Dashboard {
  totals: { campaigns: number; running: number; complete: number; groups: number; phishing: number; email: number };
  phishing: { sent: number; opened: number; clicked: number; submitted: number; reported: number; successRate: number };
  email: { sent: number; opened: number; clicked: number; openRate: number; clickRate: number };
  series: { id: string; name: string; successRate: number }[];
}
interface Campaign { id: string; name: string; status: string; type?: string; counts: Record<string, number>; }

export default function DashboardPage() {
  const { data, isLoading } = useQuery<Dashboard>({ queryKey: ['dashboard'], queryFn: () => api.get<Dashboard>('/reports/dashboard') });
  const recent = useQuery<{ rows: Campaign[] }>({ queryKey: ['campaigns', 'recent'], queryFn: () => api.get<{ rows: Campaign[] }>('/campaigns?limit=5&sort=createdAt&order=desc') });

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="How your campaigns are performing."
        actions={<Link href="/campaigns/new"><Button>New campaign</Button></Link>} />

      {isLoading || !data ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : (
        <div className="space-y-6">
          {data.totals.phishing > 0 && (
            <Card>
              <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
                <div className="lg:w-60 lg:shrink-0">
                  <div className="text-sm text-muted">Phishing success rate</div>
                  <SuccessNumber value={data.phishing.successRate} />
                  <p className="mt-2 text-sm text-ink-soft">Share of recipients who took the bait, across every phishing campaign.</p>
                </div>
                <div className="min-w-0 flex-1 lg:border-l lg:border-line lg:pl-6">
                  <div className="mb-3 font-display text-base font-semibold text-ink">Exposure pipeline</div>
                  <Funnel steps={[
                    { label: 'Sent', value: data.phishing.sent, color: 'var(--cg-sent)' },
                    { label: 'Opened', value: data.phishing.opened, color: 'var(--cg-opened)' },
                    { label: 'Clicked', value: data.phishing.clicked, color: 'var(--cg-clicked)' },
                    { label: 'Submitted', value: data.phishing.submitted, color: 'var(--cg-submitted)' },
                    { label: 'Reported', value: data.phishing.reported, color: 'var(--cg-reported)' },
                  ]} />
                </div>
              </div>
            </Card>
          )}

          {data.totals.email > 0 && (
            <Card>
              <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
                <div className="lg:w-60 lg:shrink-0">
                  <div className="flex gap-8">
                    <div><div className="text-sm text-muted">Open rate</div><div className="mt-1 font-display text-4xl font-semibold tabular-nums text-ink">{data.email.openRate}<span className="text-lg text-muted">%</span></div></div>
                    <div><div className="text-sm text-muted">Click rate</div><div className="mt-1 font-display text-4xl font-semibold tabular-nums text-ink">{data.email.clickRate}<span className="text-lg text-muted">%</span></div></div>
                  </div>
                  <p className="mt-3 text-sm text-ink-soft">Engagement across every email campaign.</p>
                </div>
                <div className="min-w-0 flex-1 lg:border-l lg:border-line lg:pl-6">
                  <div className="mb-3 font-display text-base font-semibold text-ink">Email engagement</div>
                  <Funnel steps={[
                    { label: 'Sent', value: data.email.sent, color: 'var(--cg-sent)' },
                    { label: 'Opened', value: data.email.opened, color: 'var(--cg-opened)' },
                    { label: 'Clicked', value: data.email.clicked, color: 'var(--cg-clicked)' },
                  ]} />
                </div>
              </div>
            </Card>
          )}

          {data.totals.phishing === 0 && data.totals.email === 0 && (
            <EmptyState title="No activity yet" body="Launch a campaign to see metrics here." action={<Link href="/campaigns/new"><Button size="sm">New campaign</Button></Link>} />
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Campaigns" value={data.totals.campaigns} />
            <StatTile label="Running now" value={data.totals.running} tone="var(--cg-opened)" />
            <StatTile label="Completed" value={data.totals.complete} tone="var(--cg-ok)" />
            <StatTile label="Target groups" value={data.totals.groups} />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader title="Phishing success trend" subtitle="Recent campaigns, oldest to newest" />
              <CardBody>
                {data.series.length === 0 ? <EmptyState title="No phishing campaigns yet" body="Launch one to see the trend." /> : <Trend points={data.series.map((s) => ({ label: s.name, value: s.successRate }))} />}
              </CardBody>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader title="Recent campaigns" actions={<Link href="/campaigns" className="text-sm text-primary hover:underline">View all</Link>} />
              <CardBody className="px-0 py-0">
                {(recent.data?.rows.length ?? 0) === 0 ? (
                  <div className="px-5 py-8"><EmptyState title="No campaigns yet" body="Launch your first campaign." action={<Link href="/campaigns/new"><Button size="sm">New campaign</Button></Link>} /></div>
                ) : (
                  <div className="overflow-x-auto"><table className="w-full min-w-[28rem] text-sm">
                    <tbody>
                      {recent.data!.rows.map((c) => (
                        <tr key={c.id} className="border-b border-line last:border-0">
                          <td className="px-5 py-3"><Link href={`/campaigns/${c.id}`} className="font-medium text-primary hover:underline">{c.name}</Link></td>
                          <td className="px-2 py-3"><Badge tone={c.type === 'email' ? 'opened' : 'warn'}>{c.type === 'email' ? 'Email' : 'Phishing'}</Badge></td>
                          <td className="px-2 py-3"><Badge tone={statusTone[c.status] ?? 'neutral'}>{c.status}</Badge></td>
                          <td className="px-5 py-3 text-right font-mono tabular-nums text-clicked">{c.counts?.CLICKED ?? 0} clicked</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function SuccessNumber({ value }: { value: number }) {
  const n = useCountUp(value);
  return <div className="mt-1 font-display text-6xl font-semibold tabular-nums text-ink">{n}<span className="text-2xl text-muted">%</span></div>;
}
