'use client';
import { useState } from 'react';
import { Button, DataTable, Drawer, Field, Input, Badge, ConfirmDialog, useToast, type Column } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { HtmlEditor } from '@/components/shell/HtmlEditor';
import { useListState } from '@/lib/use-list-state';
import { useList, useSaveItem, useDeleteItem } from '@/lib/resource';
import { api } from '@/lib/api-client';

interface Landing { id: string; name: string; redirectUrl: string; html: string; captureData: boolean; capturePasswords: boolean; updatedAt: string; }
const empty = { name: '', redirectUrl: '', html: '', captureData: true, capturePasswords: false };

export function LandingPagesScreen() {
  const ls = useListState();
  const { data, isLoading } = useList<Landing>('landing-pages', ls.params);
  const save = useSaveItem<Landing>('landing-pages');
  const del = useDeleteItem('landing-pages');
  const { notify } = useToast();
  const [editing, setEditing] = useState<null | (typeof empty & { id?: string })>(null);
  const [toDelete, setToDelete] = useState<Landing | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  const columns: Column<Landing>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: 'capture', header: 'Capture', render: (r) => r.captureData ? <Badge tone="warn">{r.capturePasswords ? 'Data + passwords' : 'Data'}</Badge> : <Badge>Off</Badge> },
  ];

  const onSave = async () => {
    if (!editing) return;
    const { id, ...body } = editing;
    try { await save.mutateAsync({ id, body }); notify(id ? 'Landing page updated' : 'Landing page created', 'success'); setEditing(null); }
    catch (e) { notify((e as Error).message, 'error'); }
  };

  const doImport = async () => {
    if (!editing || !importUrl) return;
    setImporting(true);
    try { const r = await api.post<{ html: string }>('/import/site', { url: importUrl }); setEditing({ ...editing, html: r.html }); setImportUrl(''); notify('Site imported', 'success'); }
    catch (e) { notify((e as Error).message, 'error'); } finally { setImporting(false); }
  };

  return (
    <div>
      <PageHeader title="Landing pages" subtitle="Where a clicked link takes the recipient."
        actions={<Button onClick={() => setEditing({ ...empty })}>New landing page</Button>} />
      <DataTable columns={columns} rows={data?.rows ?? []} rowKey={(r) => r.id} loading={isLoading} sort={ls.sort} onSort={ls.onSort}
        search={{ ...ls.search, placeholder: 'Search landing pages…' }}
        pagination={data ? { page: data.page, limit: data.limit, total: data.total, onPage: ls.setPage } : undefined}
        empty={{ title: 'No landing pages yet', body: 'Build the page recipients see after they click.', action: <Button onClick={() => setEditing({ ...empty })}>New landing page</Button> }}
        rowActions={(r) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing({ id: r.id, name: r.name, redirectUrl: r.redirectUrl, html: r.html, captureData: r.captureData, capturePasswords: r.capturePasswords })}>Edit</Button>
            <Button variant="ghost" size="sm" onClick={() => setToDelete(r)}>Delete</Button>
          </div>
        )} />
      {editing && (
        <Drawer open onOpenChange={(o) => !o && setEditing(null)} title={editing.id ? 'Edit landing page' : 'New landing page'}
          footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={onSave} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button></>}>
          <div className="space-y-4">
            <Field label="Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Redirect URL" hint="Where the recipient lands after submitting."><Input value={editing.redirectUrl} onChange={(e) => setEditing({ ...editing, redirectUrl: e.target.value })} placeholder="https://…" /></Field>
            <div className="flex items-end gap-2">
              <Field label="Import from a URL" hint="Fetches public HTML as a starting point."><Input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://site-to-clone.com" /></Field>
              <Button variant="secondary" onClick={doImport} disabled={importing || !importUrl}>{importing ? 'Importing…' : 'Import'}</Button>
            </div>
            <Field label="Page HTML"><HtmlEditor value={editing.html} onChange={(v) => setEditing({ ...editing, html: v })} /></Field>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={editing.captureData} onChange={(e) => setEditing({ ...editing, captureData: e.target.checked, capturePasswords: e.target.checked ? editing.capturePasswords : false })} />
              Capture submitted form data
            </label>
            {editing.captureData && (
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={editing.capturePasswords} onChange={(e) => setEditing({ ...editing, capturePasswords: e.target.checked })} />
                Also capture password fields
              </label>
            )}
          </div>
        </Drawer>
      )}
      <ConfirmDialog open={Boolean(toDelete)} onOpenChange={(o) => !o && setToDelete(null)} title="Delete this landing page?" body={toDelete?.name} destructive confirmLabel="Delete"
        onConfirm={async () => { if (toDelete) { await del.mutateAsync(toDelete.id); notify('Landing page deleted', 'success'); setToDelete(null); } }} />
    </div>
  );
}
