'use client';
import { useState } from 'react';
import { Button, DataTable, Input, ConfirmDialog, useToast, type Column } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
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
