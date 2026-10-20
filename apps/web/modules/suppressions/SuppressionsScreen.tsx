'use client';
import { useState } from 'react';
import { Button, DataTable, Input, ConfirmDialog, useToast, type Column } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useListState } from '@/lib/use-list-state';
import { useList, useSaveItem, useDeleteItem } from '@/lib/resource';

interface Suppression { id: string; email: string; reason: string; createdAt: string; }

export function SuppressionsScreen() {
  const ls = useListState({ sort: 'createdAt' });
  const { data, isLoading } = useList<Suppression>('suppressions', ls.params);
  const save = useSaveItem<Suppression>('suppressions');
  const del = useDeleteItem('suppressions');
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [toDelete, setToDelete] = useState<Suppression | null>(null);
  const webhook = useQuery<{ url: string }>({ queryKey: ['webhook', 'token'], queryFn: () => api.get<{ url: string }>('/webhooks/token') });

  const add = async () => {
    try { await save.mutateAsync({ body: { email } }); setEmail(''); notify('Added to suppression list', 'success'); }
    catch (e) { notify((e as Error).message, 'error'); }
  };

  const columns: Column<Suppression>[] = [
    { key: 'email', header: 'Email', mono: true, render: (r) => <span className="font-mono text-ink">{r.email}</span> },
    { key: 'reason', header: 'Reason' },
    { key: 'createdAt', header: 'Added', render: (r) => <span className="text-muted">{new Date(r.createdAt).toLocaleDateString()}</span> },
  ];

  return (
    <div>
      <PageHeader title="Suppressions" subtitle="People who unsubscribed or must never be emailed. Campaigns skip them." />
      <div className="mb-4 flex max-w-md items-end gap-2">
        <div className="flex-1"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" aria-label="Email to suppress" /></div>
        <Button onClick={add} disabled={!email}>Add</Button>
      </div>
      {webhook.data?.url && (
        <div className="mb-6 rounded-cg border border-line bg-panel-2 p-4 text-sm">
          <div className="font-medium text-ink">Bounce webhook</div>
          <p className="mt-1 text-muted">Point your email provider&rsquo;s bounce/complaint webhook here — bounced addresses are suppressed automatically.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-cg-sm bg-surface px-2 py-1 font-mono text-xs text-ink-soft">{webhook.data.url}</code>
            <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard?.writeText(webhook.data!.url); notify('Webhook URL copied', 'success'); }}>Copy</Button>
          </div>
        </div>
      )}
      <DataTable columns={columns} rows={data?.rows ?? []} rowKey={(r) => r.id} loading={isLoading} sort={ls.sort} onSort={ls.onSort}
        search={{ ...ls.search, placeholder: 'Search suppressions…' }}
        pagination={data ? { page: data.page, limit: data.limit, total: data.total, onPage: ls.setPage } : undefined}
        empty={{ title: 'No suppressions', body: 'Unsubscribes land here automatically; you can also add addresses by hand.' }}
        rowActions={(r) => <Button variant="ghost" size="sm" onClick={() => setToDelete(r)}>Remove</Button>} />
      <ConfirmDialog open={Boolean(toDelete)} onOpenChange={(o) => !o && setToDelete(null)} title="Remove from suppression list?" body={`${toDelete?.email} may receive emails again.`} confirmLabel="Remove"
        onConfirm={async () => { if (toDelete) { await del.mutateAsync(toDelete.id); notify('Removed', 'success'); setToDelete(null); } }} />
    </div>
  );
}
