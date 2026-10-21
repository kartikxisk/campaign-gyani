'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, DataTable, Badge, statusTone, ConfirmDialog, Select, useToast, type Column } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { useListState } from '@/lib/use-list-state';
import { useList, useDeleteItem } from '@/lib/resource';
import { useViewMode } from '@/lib/view-mode';

interface Campaign { id: string; name: string; status: string; type?: string; launchedAt: string | null; sendByDate: string; counts: Record<string, number>; }

const TYPE_FILTERS = [{ value: '', label: 'All types' }, { value: 'phishing', label: 'Phishing' }, { value: 'email', label: 'Email' }];

export function CampaignsScreen() {
  const { mode } = useViewMode();
  const ls = useListState({ sort: 'createdAt' });
  // The list follows the console mode by default; the Select can widen to all.
  const [type, setType] = useState<string>(mode);
  useEffect(() => { setType(mode); ls.setPage(1); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data, isLoading } = useList<Campaign>('campaigns', { ...ls.params, filters: { type } });
  const del = useDeleteItem('campaigns');
  const { notify } = useToast();
  const [toDelete, setToDelete] = useState<Campaign | null>(null);

  const columns: Column<Campaign>[] = [
    { key: 'name', header: 'Campaign', sortable: true, render: (r) => <Link href={`/campaigns/${r.id}`} className="font-medium text-primary hover:underline">{r.name}</Link> },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <Badge tone={statusTone[r.status] ?? 'neutral'}>{r.status}</Badge> },
    { key: 'type', header: 'Type', render: (r) => <Badge tone={r.type === 'email' ? 'opened' : 'warn'}>{r.type === 'email' ? 'Email' : 'Phishing'}</Badge> },
    { key: 'sent', header: 'Sent', align: 'right', render: (r) => <span className="font-mono tabular-nums">{r.counts.SENT ?? 0}</span> },
    { key: 'opened', header: 'Opened', align: 'right', render: (r) => <span className="font-mono tabular-nums text-opened">{r.counts.OPENED ?? 0}</span> },
    { key: 'submitted', header: 'Submitted', align: 'right', render: (r) => <span className="font-mono tabular-nums text-submitted">{r.counts.SUBMITTED ?? 0}</span> },
  ];

  return (
    <div>
      <PageHeader title="Campaigns" subtitle="Every campaign you've run."
        actions={
          <div className="flex items-center gap-2">
            <a href="/api/reports/campaigns.csv"><Button variant="secondary">Export CSV</Button></a>
            <Link href="/campaigns/new"><Button>New campaign</Button></Link>
          </div>
        } />
      <DataTable columns={columns} rows={data?.rows ?? []} rowKey={(r) => r.id} loading={isLoading} sort={ls.sort} onSort={ls.onSort}
        search={{ ...ls.search, placeholder: 'Search campaigns…' }}
        toolbar={<div className="w-40"><Select options={TYPE_FILTERS} value={type} onChange={(e) => { setType(e.target.value); ls.setPage(1); }} aria-label="Filter by type" /></div>}
        pagination={data ? { page: data.page, limit: data.limit, total: data.total, onPage: ls.setPage } : undefined}
        empty={{ title: 'No campaigns yet', body: 'Launch your first campaign.', action: <Link href="/campaigns/new"><Button>New campaign</Button></Link> }}
        rowActions={(r) => (
          <div className="flex justify-end gap-2">
            {r.status === 'DRAFT' && <Link href={`/campaigns/${r.id}/edit`}><Button variant="ghost" size="sm">Edit</Button></Link>}
            <Link href={`/campaigns/${r.id}`}><Button variant="ghost" size="sm">View</Button></Link>
            <Button variant="ghost" size="sm" onClick={() => setToDelete(r)}>Delete</Button>
          </div>
        )} />
      <ConfirmDialog open={Boolean(toDelete)} onOpenChange={(o) => !o && setToDelete(null)} title="Delete this campaign?" body={toDelete?.name} destructive confirmLabel="Delete"
        onConfirm={async () => { if (toDelete) { await del.mutateAsync(toDelete.id); notify('Campaign deleted', 'success'); setToDelete(null); } }} />
    </div>
  );
}
