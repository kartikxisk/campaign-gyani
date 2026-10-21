'use client';
import { Fragment, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Button, Card, CardBody, CardHeader, Badge, statusTone, Funnel, StatTile, DataTable, Drawer, Select, ConfirmDialog, Menu, useToast, type Column } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { api } from '@/lib/api-client';
import { parseUA } from '@/lib/ua';
import { useDateFmt } from '@/lib/datetime';
import { openRate, clickRate } from '@cg/shared';

interface Campaign { id: string; name: string; status: string; type?: string; launchedAt: string | null; completedAt: string | null; publicEnabled: boolean; publicCode: string | null; repeat?: string | null; nextRunAt?: string | null; }
interface Counts { sent: number; opened: number; clicked: number; submitted: number; reported: number; successRate: number; }
interface Result { id: string; email: string; firstName: string; lastName: string; position: string; status: string; reported: boolean; error?: string | null; }
interface Event { id: string; resultId: string; type: string; ip?: string; userAgent?: string; createdAt: string; payload?: Record<string, unknown>; }
interface Page<T> { rows: T[]; total: number; page: number; limit: number; }

const STATUS_FILTERS = [{ value: '', label: 'All statuses' }, ...['SCHEDULED', 'SENT', 'OPENED', 'CLICKED', 'SUBMITTED', 'REPORTED', 'ERROR'].map((s) => ({ value: s, label: s }))];
const PAGE_SIZE = 25;

export function CampaignReport({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { notify } = useToast();
  const download = (path: string) => { const a = document.createElement('a'); a.href = path; a.click(); };
  const campaign = useQuery<Campaign>({ queryKey: ['campaigns', 'item', id], queryFn: () => api.get<Campaign>(`/campaigns/${id}`) });
  const counts = useQuery<Counts>({ queryKey: ['campaigns', id, 'counts'], queryFn: () => api.get<Counts>(`/campaigns/${id}/report`), refetchInterval: 15000 });
  const email = campaign.data?.type === 'email';
  const fmt = useDateFmt();

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');
  const [openResult, setOpenResult] = useState<Result | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Server-side pagination: a campaign can hold 100k result rows, so the table
  // pulls one page at a time and filters/searches on the server, never in memory.
  const results = useQuery<Page<Result>>({
    queryKey: ['campaigns', id, 'results', { page, filter, query }],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (filter) qs.set('status', filter);
      if (query) qs.set('query', query);
      return api.get<Page<Result>>(`/campaigns/${id}/results?${qs.toString()}`);
    },
    refetchInterval: 15000,
    placeholderData: keepPreviousData,
  });
  const data = results.data;
  const c = counts.data;

  const refetchAll = () => { qc.invalidateQueries({ queryKey: ['campaigns', id] }); qc.invalidateQueries({ queryKey: ['campaigns', 'item', id] }); };

  const togglePublic = async (enabled: boolean) => {
    await api.patch(`/campaigns/${id}/visibility`, { enabled });
    notify(enabled ? 'Public link enabled' : 'Public link revoked', 'success');
    qc.invalidateQueries({ queryKey: ['campaigns', 'item', id] });
  };
  const copyPublic = () => {
    const code = campaign.data?.publicCode;
    if (code) { navigator.clipboard?.writeText(`${window.location.origin}/r/${code}`); notify('Public link copied', 'success'); }
  };
  const complete = async () => { await api.post(`/campaigns/${id}/complete`); notify('Marked complete', 'success'); refetchAll(); };
  const launch = async () => { try { await api.post(`/campaigns/${id}/launch`); notify('Campaign launched', 'success'); refetchAll(); } catch (e) { notify((e as Error).message, 'error'); } };
  const pause = async () => { await api.post(`/campaigns/${id}/pause`); notify('Campaign paused', 'success'); refetchAll(); };
  const resume = async () => { await api.post(`/campaigns/${id}/resume`); notify('Campaign resumed', 'success'); refetchAll(); };

  const columns: Column<Result>[] = [
    { key: 'name', header: 'Recipient', render: (r) => <div><div className="font-medium text-ink">{[r.firstName, r.lastName].filter(Boolean).join(' ') || '—'}</div><div className="font-mono text-xs text-muted">{r.email}</div></div> },
    { key: 'position', header: 'Role' },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone[r.status] ?? 'neutral'}>{r.status}</Badge> },
    ...(email ? [] : [{ key: 'reported', header: 'Reported', render: (r: Result) => r.reported ? <Badge tone="reported">Yes</Badge> : <span className="text-muted">No</span> }]),
  ];

  if (!campaign.data) return <div className="text-sm text-muted">Loading…</div>;
  const cam = campaign.data;

  return (
    <div>
      <PageHeader title={cam.name}
        subtitle={[cam.launchedAt ? `Launched ${fmt.dateTime(cam.launchedAt)}` : 'Not launched', cam.repeat && cam.repeat !== 'NONE' ? `Repeats ${cam.repeat.toLowerCase()}${cam.nextRunAt ? ` · next ${fmt.date(cam.nextRunAt)}` : ''}` : ''].filter(Boolean).join(' · ')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone[cam.status] ?? 'neutral'}>{cam.status}</Badge>
            {cam.status === 'DRAFT' && <><Button size="sm" onClick={launch}>Launch</Button><Link href={`/campaigns/${id}/edit`}><Button variant="secondary" size="sm">Edit</Button></Link></>}
            {cam.status === 'RUNNING' && <Button variant="secondary" size="sm" onClick={pause}>Pause</Button>}
            {cam.status === 'SCHEDULED' && <Button variant="secondary" size="sm" onClick={pause}>Pause</Button>}
            {cam.status === 'PAUSED' && <Button size="sm" onClick={resume}>Resume</Button>}
            {['RUNNING', 'PAUSED', 'SCHEDULED'].includes(cam.status) && <Button variant="secondary" size="sm" onClick={complete}>Mark complete</Button>}
            {cam.publicEnabled && <Button variant="secondary" size="sm" onClick={copyPublic}>Copy link</Button>}
            <Menu label="Actions" items={[
              cam.publicEnabled
                ? { label: 'Revoke public link', onSelect: () => togglePublic(false) }
                : { label: 'Share public link', onSelect: () => togglePublic(true) },
              { label: 'Export results (CSV)', onSelect: () => download(`/api/campaigns/${id}/export/results.csv`) },
              { label: 'Export events (CSV)', onSelect: () => download(`/api/campaigns/${id}/export/events.csv`) },
              { label: 'Delete campaign', onSelect: () => setConfirmDelete(true), destructive: true },
            ]} />
          </div>
        } />

      <div className={`mb-6 grid grid-cols-2 gap-4 ${email ? 'lg:grid-cols-5' : 'lg:grid-cols-6'}`}>
        <StatTile label="Sent" value={c?.sent ?? 0} />
        <StatTile label="Opened" value={c?.opened ?? 0} tone="var(--cg-opened)" />
        <StatTile label="Clicked" value={c?.clicked ?? 0} tone="var(--cg-clicked)" />
        {email ? (
          <>
            <StatTile label="Open rate" value={`${openRate(c?.sent ?? 0, c?.opened ?? 0)}%`} tone="var(--cg-opened)" />
            <StatTile label="Click rate" value={`${clickRate(c?.sent ?? 0, c?.clicked ?? 0)}%`} tone="var(--cg-primary)" />
          </>
        ) : (
          <>
            <StatTile label="Submitted" value={c?.submitted ?? 0} tone="var(--cg-submitted)" />
            <StatTile label="Reported" value={c?.reported ?? 0} tone="var(--cg-reported)" />
            <StatTile label="Success" value={`${c?.successRate ?? 0}%`} tone="var(--cg-primary)" />
          </>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader title={email ? 'Engagement funnel' : 'Exposure funnel'} />
        <CardBody>
          <Funnel steps={[
            { label: 'Sent', value: c?.sent ?? 0, color: 'var(--cg-sent)' },
            { label: 'Opened', value: c?.opened ?? 0, color: 'var(--cg-opened)' },
            { label: 'Clicked', value: c?.clicked ?? 0, color: 'var(--cg-clicked)' },
            ...(email ? [] : [
              { label: 'Submitted', value: c?.submitted ?? 0, color: 'var(--cg-submitted)' },
              { label: 'Reported', value: c?.reported ?? 0, color: 'var(--cg-reported)' },
            ]),
          ]} />
        </CardBody>
      </Card>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Results{data ? <span className="ml-2 text-sm font-normal text-muted">{data.total.toLocaleString()}</span> : null}</h2>
        <div className="w-48"><Select options={STATUS_FILTERS} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} /></div>
      </div>
      <DataTable columns={columns} rows={data?.rows ?? []} rowKey={(r) => r.id} loading={results.isLoading} onRowClick={(r) => setOpenResult(r)}
        search={{ value: query, onChange: (v) => { setQuery(v); setPage(1); }, placeholder: 'Search recipients…' }}
        pagination={data ? { page: data.page, limit: data.limit, total: data.total, onPage: setPage } : undefined}
        empty={{ title: 'No results yet', body: 'Results appear as messages are sent.' }}
        rowActions={(r) => <Button variant="ghost" size="sm" onClick={() => setOpenResult(r)}>Timeline</Button>} />

      {openResult && (
        <Drawer open onOpenChange={(o) => !o && setOpenResult(null)} title={`Timeline — ${openResult.email}`} description={openResult.error ?? undefined}>
          <ResultTimeline campaignId={id} resultId={openResult.id} fmt={fmt} />
        </Drawer>
      )}

      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this campaign?" body="Results and events will be removed." destructive confirmLabel="Delete"
        onConfirm={async () => { await api.del(`/campaigns/${id}`); notify('Campaign deleted', 'success'); router.push('/campaigns'); }} />
    </div>
  );
}

// Fetches just this recipient's events, so opening a drawer never pulls the
// whole campaign's event feed (which can be hundreds of thousands of rows).
function ResultTimeline({ campaignId, resultId, fmt }: { campaignId: string; resultId: string; fmt: ReturnType<typeof useDateFmt> }) {
  const events = useQuery<Page<Event>>({
    queryKey: ['campaigns', campaignId, 'timeline', resultId],
    queryFn: () => api.get<Page<Event>>(`/campaigns/${campaignId}/timeline?resultId=${resultId}&limit=200`),
  });
  if (events.isLoading) return <p className="text-sm text-muted">Loading…</p>;
  const rows = events.data?.rows ?? [];
  if (rows.length === 0) return <p className="text-sm text-muted">No events recorded yet.</p>;
  return (
    <ol className="space-y-3">
      {rows.map((e) => (
        <li key={e.id} className="rounded-cg border border-line p-3">
          <div className="flex items-center justify-between"><Badge tone={statusTone[e.type] ?? 'neutral'}>{e.type}</Badge><span className="text-xs text-muted">{fmt.dateTime(e.createdAt)}</span></div>
          {(e.ip || e.userAgent) && (() => { const ua = parseUA(e.userAgent); return (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
              {e.ip && <span className="font-mono">{e.ip}</span>}
              {e.userAgent && <span>{ua.browser} · {ua.os}</span>}
            </div>
          ); })()}
          {e.payload && Object.keys(e.payload).length > 0 && (
            <dl className="mt-2 grid grid-cols-[100px_1fr] gap-1 text-xs">
              {Object.entries(e.payload).map(([k, v]) => <Fragment key={k}><dt className="text-muted">{k}</dt><dd className="font-mono text-ink">{String(v)}</dd></Fragment>)}
            </dl>
          )}
        </li>
      ))}
    </ol>
  );
}
