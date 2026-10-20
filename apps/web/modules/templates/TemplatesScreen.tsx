'use client';
import { useState } from 'react';
import { Button, DataTable, Drawer, Field, Input, useToast, type Column } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { HtmlEditor } from '@/components/shell/HtmlEditor';
import { useListState } from '@/lib/use-list-state';
import { useList, useSaveItem, useDeleteItem } from '@/lib/resource';
import { ConfirmDialog } from '@cg/ui';

interface Template { id: string; name: string; subject: string; envelopeSender: string; externalUrl?: string | null; textBody: string; htmlBody: string; updatedAt: string; }
const empty = { name: '', envelopeSender: '', subject: '', externalUrl: '', textBody: '', htmlBody: '' };

export function TemplatesScreen() {
  const ls = useListState();
  const { data, isLoading } = useList<Template>('templates', ls.params);
  const save = useSaveItem<Template>('templates');
  const del = useDeleteItem('templates');
  const { notify } = useToast();
  const [editing, setEditing] = useState<null | (typeof empty & { id?: string })>(null);
  const [toDelete, setToDelete] = useState<Template | null>(null);

  const columns: Column<Template>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: 'subject', header: 'Subject', sortable: true, render: (r) => <span className="text-ink-soft">{r.subject}</span> },
    { key: 'envelopeSender', header: 'From' },
  ];

  const onSave = async () => {
    if (!editing) return;
    const { id, ...body } = editing;
    try {
      await save.mutateAsync({ id, body: { ...body, attachments: [] } });
      notify(id ? 'Template updated' : 'Template created', 'success');
      setEditing(null);
    } catch (e) { notify((e as Error).message, 'error'); }
  };

  return (
    <div>
      <PageHeader title="Email templates" subtitle="The messages your campaigns send."
        actions={<Button onClick={() => setEditing({ ...empty })}>New template</Button>} />
      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(r) => r.id}
        loading={isLoading}
        sort={ls.sort}
        onSort={ls.onSort}
        search={{ ...ls.search, placeholder: 'Search templates…' }}
        pagination={data ? { page: data.page, limit: data.limit, total: data.total, onPage: ls.setPage } : undefined}
        empty={{ title: 'No templates yet', body: 'Create your first email template to use in a campaign.', action: <Button onClick={() => setEditing({ ...empty })}>New template</Button> }}
        rowActions={(r) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing({ id: r.id, name: r.name, envelopeSender: r.envelopeSender, subject: r.subject, externalUrl: r.externalUrl ?? '', textBody: r.textBody, htmlBody: r.htmlBody })}>Edit</Button>
            <Button variant="ghost" size="sm" onClick={() => setToDelete(r)}>Delete</Button>
          </div>
        )}
      />
      {editing && (
        <Drawer open onOpenChange={(o) => !o && setEditing(null)} title={editing.id ? 'Edit template' : 'New template'}
          footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={onSave} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save template'}</Button></>}>
          <div className="space-y-4">
            <Field label="Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="From (envelope sender)" hint="e.g. IT Support <it@yourco.com>"><Input value={editing.envelopeSender} onChange={(e) => setEditing({ ...editing, envelopeSender: e.target.value })} /></Field>
            <Field label="Subject"><Input value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} /></Field>
            <Field label="External URL (optional)" hint="Used by the {{.ExternalURL}} token for self-hosted landing pages."><Input value={editing.externalUrl} onChange={(e) => setEditing({ ...editing, externalUrl: e.target.value })} /></Field>
            <Field label="Body"><HtmlEditor value={editing.htmlBody} onChange={(v) => setEditing({ ...editing, htmlBody: v })} /></Field>
          </div>
        </Drawer>
      )}
      <ConfirmDialog open={Boolean(toDelete)} onOpenChange={(o) => !o && setToDelete(null)} title="Delete this template?" body={toDelete?.name} destructive confirmLabel="Delete"
        onConfirm={async () => { if (toDelete) { await del.mutateAsync(toDelete.id); notify('Template deleted', 'success'); setToDelete(null); } }} />
    </div>
  );
}
