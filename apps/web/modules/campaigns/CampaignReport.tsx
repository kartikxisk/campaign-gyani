'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardBody, CardHeader, Badge, statusTone, Funnel, StatTile, DataTable, Drawer, Select, ConfirmDialog, Menu, useToast, type Column } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { api } from '@/lib/api-client';
import { parseUA } from '@/lib/ua';

interface Campaign { id: string; name: string; status: string; launchedAt: string | null; completedAt: string | null; publicEnabled: boolean; publicCode: string | null; }
interface Counts { sent: number; opened: number; clicked: number; submitted: number; reported: number; successRate: number; }
interface Result { id: string; email: string; firstName: string; lastName: string; position: string; status: string; reported: boolean; error?: string | null; }
interface Event { id: string; resultId: string; type: string; ip?: string; userAgent?: string; createdAt: string; payload?: Record<string, unknown>; }

const STATUS_FILTERS = [{ value: '', label: 'All statuses' }, ...['SCHEDULED', 'SENT', 'OPENED', 'CLICKED', 'SUBMITTED', 'REPORTED', 'ERROR'].map((s) => ({ value: s, label: s }))];

export function CampaignReport({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { notify } = useToast();
  const download = (path: string) => { const a = document.createElement('a'); a.href = path; a.click(); };
  const campaign = useQuery<Campaign>({ queryKey: ['campaigns', 'item', id], queryFn: () => api.get<Campaign>(`/campaigns/${id}`) });
  const counts = useQuery<Counts>({ queryKey: ['campaigns', id, 'counts'], queryFn: () => api.get<Counts>(`/campaigns/${id}/report`), refetchInterval: 15000 });
  const results = useQuery<Result[]>({ queryKey: ['campaigns', id, 'results'], queryFn: () => api.get<Result[]>(`/campaigns/${id}/results`), refetchInterval: 15000 });
  const timeline = useQuery<Event[]>({ queryKey: ['campaigns', id, 'timeline'], queryFn: () => api.get<Event[]>(`/campaigns/${id}/timeline`), refetchInterval: 15000 });

  const [filter, setFilter] = useState('');
  const [openResult, setOpenResult] = useState<Result | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const eventsByResult = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of timeline.data ?? []) { const arr = map.get(e.resultId) ?? []; arr.push(e); map.set(e.resultId, arr); }
    return map;
  }, [timeline.data]);

  const rows = (results.data ?? []).filter((r) => !filter || r.status === filter);
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

  const columns: Column<Result>[] = [
    { key: 'name', header: 'Recipient', render: (r) => <div><div className="font-medium text-ink">{[r.firstName, r.lastName].filter(Boolean).join(' ') || '—'}</div><div className="font-mono text-xs text-muted">{r.email}</div></div> },
    { key: 'position', header: 'Role' },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone[r.status] ?? 'neutral'}>{r.status}</Badge> },
    { key: 'reported', header: 'Reported', render: (r) => r.reported ? <Badge tone="reported">Yes</Badge> : <span className="text-muted">No</span> },
  ];

  if (!campaign.data) return <div className="text-sm text-muted">Loading…</div>;
  const cam = campaign.data;

  return (
    <div>
      <PageHeader title={cam.name}
        subtitle={cam.launchedAt ? `Launched ${new Date(cam.launchedAt).toLocaleString()}` : 'Not launched'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone[cam.status] ?? 'neutral'}>{cam.status}</Badge>
            {cam.status !== 'COMPLETE' && <Button variant="secondary" size="sm" onClick={complete}>Mark complete</Button>}
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

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatTile label="Sent" value={c?.sent ?? 0} />
        <StatTile label="Opened" value={c?.opened ?? 0} tone="var(--cg-opened)" />
        <StatTile label="Clicked" value={c?.clicked ?? 0} tone="var(--cg-clicked)" />
        <StatTile label="Submitted" value={c?.submitted ?? 0} tone="var(--cg-submitted)" />
        <StatTile label="Reported" value={c?.reported ?? 0} tone="var(--cg-reported)" />
        <StatTile label="Success" value={`${c?.successRate ?? 0}%`} tone="var(--cg-primary)" />
      </div>

      <Card className="mb-6">
        <CardHeader title="Exposure funnel" />
        <CardBody>
          <Funnel steps={[
            { label: 'Sent', value: c?.sent ?? 0, color: 'var(--cg-sent)' },
            { label: 'Opened', value: c?.opened ?? 0, color: 'var(--cg-opened)' },
            { label: 'Clicked', value: c?.clicked ?? 0, color: 'var(--cg-clicked)' },
            { label: 'Submitted', value: c?.submitted ?? 0, color: 'var(--cg-submitted)' },
            { label: 'Reported', value: c?.reported ?? 0, color: 'var(--cg-reported)' },
          ]} />
        </CardBody>
      </Card>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Results</h2>
        <div className="w-48"><Select options={STATUS_FILTERS} value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} loading={results.isLoading} onRowClick={(r) => setOpenResult(r)}
        empty={{ title: 'No results yet', body: 'Results appear as messages are sent.' }}
        rowActions={(r) => <Button variant="ghost" size="sm" onClick={() => setOpenResult(r)}>Timeline</Button>} />

      {openResult && (
        <Drawer open onOpenChange={(o) => !o && setOpenResult(null)} title={`Timeline — ${openResult.email}`} description={openResult.error ?? undefined}>
          <ol className="space-y-3">
            {(eventsByResult.get(openResult.id) ?? []).map((e) => (
              <li key={e.id} className="rounded-cg border border-line p-3">
                <div className="flex items-center justify-between"><Badge tone={statusTone[e.type] ?? 'neutral'}>{e.type}</Badge><span className="text-xs text-muted">{new Date(e.createdAt).toLocaleString()}</span></div>
                {(e.ip || e.userAgent) && (() => { const ua = parseUA(e.userAgent); return (
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                    {e.ip && <span className="font-mono">{e.ip}</span>}
                    {e.userAgent && <span>{ua.browser} · {ua.os}</span>}
                  </div>
                ); })()}
                {e.payload && Object.keys(e.payload).length > 0 && (
                  <dl className="mt-2 grid grid-cols-[100px_1fr] gap-1 text-xs">
                    {Object.entries(e.payload).map(([k, v]) => <><dt key={k} className="text-muted">{k}</dt><dd className="font-mono text-ink">{String(v)}</dd></>)}
                  </dl>
                )}
              </li>
            ))}
            {(eventsByResult.get(openResult.id) ?? []).length === 0 && <li className="text-sm text-muted">No events recorded yet.</li>}
          </ol>
        </Drawer>
      )}

      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this campaign?" body="Results and events will be removed." destructive confirmLabel="Delete"
        onConfirm={async () => { await api.del(`/campaigns/${id}`); notify('Campaign deleted', 'success'); router.push('/campaigns'); }} />
    </div>
  );
}
