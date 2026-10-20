'use client';
import { use, useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, Funnel, StatTile, Badge, statusTone } from '@cg/ui';

interface Report { name: string; status: string; launchedAt: string | null; counts: { sent: number; opened: number; clicked: number; submitted: number; reported: number; successRate: number } }

export default function PublicReportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!/^[A-Za-z0-9_-]+$/.test(code)) { setError(true); return; }
    fetch(`/api/public/campaigns/${encodeURIComponent(code)}`).then((r) => (r.ok ? r.json() : Promise.reject())).then(setReport).catch(() => setError(true));
  }, [code]);

  if (error) return <main className="flex min-h-screen items-center justify-center text-sm text-muted">This report link is not available.</main>;
  if (!report) return <main className="flex min-h-screen items-center justify-center text-sm text-muted">Loading…</main>;
  const c = report.counts;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-cg bg-primary font-display font-bold text-primary-ink">cg</span>
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">{report.name}</h1>
          <p className="text-sm text-muted">Phishing simulation report</p>
        </div>
        <span className="ml-auto"><Badge tone={statusTone[report.status] ?? 'neutral'}>{report.status}</Badge></span>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Sent" value={c.sent} />
        <StatTile label="Opened" value={c.opened} tone="var(--cg-opened)" />
        <StatTile label="Clicked" value={c.clicked} tone="var(--cg-clicked)" />
        <StatTile label="Submitted" value={c.submitted} tone="var(--cg-submitted)" />
        <StatTile label="Reported" value={c.reported} tone="var(--cg-reported)" />
        <StatTile label="Success" value={`${c.successRate}%`} tone="var(--cg-primary)" />
      </div>
      <Card>
        <CardHeader title="Exposure funnel" />
        <CardBody>
          <Funnel steps={[
            { label: 'Sent', value: c.sent, color: 'var(--cg-sent)' },
            { label: 'Opened', value: c.opened, color: 'var(--cg-opened)' },
            { label: 'Clicked', value: c.clicked, color: 'var(--cg-clicked)' },
            { label: 'Submitted', value: c.submitted, color: 'var(--cg-submitted)' },
            { label: 'Reported', value: c.reported, color: 'var(--cg-reported)' },
          ]} />
        </CardBody>
      </Card>
    </main>
  );
}
