'use client';
import { useState } from 'react';
import { Button, Field, Input, Badge } from '@cg/ui';
import { api } from '@/lib/api-client';

type Status = 'pass' | 'warn' | 'fail' | 'missing' | 'skipped';
interface Check { status: Status; message: string; policy?: string }
interface Report { domain: string; spf: Check; dmarc: Check; dkim: Check }

const tone: Record<Status, 'ok' | 'warn' | 'danger' | 'neutral'> = {
  pass: 'ok', warn: 'warn', fail: 'danger', missing: 'danger', skipped: 'neutral',
};

export function DeliverabilityCheck({ fromAddress }: { fromAddress: string }) {
  const [domain, setDomain] = useState(fromAddress);
  const [selector, setSelector] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!domain.trim()) return;
    setBusy(true); setError(null);
    try {
      const body: Record<string, string> = { domain: domain.trim() };
      if (selector.trim()) body.selector = selector.trim();
      setReport(await api.post<Report>('/deliverability/domain', body));
    } catch (e) { setError((e as Error).message); setReport(null); }
    finally { setBusy(false); }
  };

  const Row = ({ label, c }: { label: string; c: Check }) => (
    <div className="flex items-start gap-3 py-1.5">
      <Badge tone={tone[c.status]}>{c.status}</Badge>
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}{c.policy ? ` · p=${c.policy}` : ''}</div>
        <div className="text-xs text-muted">{c.message}</div>
      </div>
    </div>
  );

  return (
    <div className="rounded-cg border border-line bg-surface/60 p-3">
      <div className="mb-2 text-sm font-medium text-ink">Deliverability pre-flight</div>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Domain or from-address"><Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourco.com" /></Field>
        <Field label="DKIM selector (optional)"><Input value={selector} onChange={(e) => setSelector(e.target.value)} placeholder="e.g. google" className="w-40" /></Field>
        <Button variant="secondary" onClick={run} disabled={busy || !domain.trim()}>{busy ? 'Checking…' : 'Check SPF / DKIM / DMARC'}</Button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {report && (
        <div className="mt-3 divide-y divide-line">
          <Row label="SPF" c={report.spf} />
          <Row label="DMARC" c={report.dmarc} />
          <Row label="DKIM" c={report.dkim} />
        </div>
      )}
    </div>
  );
}
