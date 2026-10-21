'use client';
import { useRef, useState } from 'react';
import { Button, DataTable, Drawer, Modal, Field, Input, Textarea, Tabs, useToast, ConfirmDialog, type Column } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { HtmlEditor } from '@/components/shell/HtmlEditor';
import { PreviewFrame } from '@/components/shell/PreviewFrame';
import { useListState } from '@/lib/use-list-state';
import { useList, useSaveItem, useDeleteItem } from '@/lib/resource';
import { api } from '@/lib/api-client';
import { AiTemplateModal } from './AiTemplateModal';

interface Attachment { assetId: string; filename: string; }
interface Template { id: string; name: string; subject: string; envelopeSender: string; externalUrl?: string | null; textBody: string; htmlBody: string; attachments: Attachment[]; updatedAt: string; }
type Editing = { id?: string; name: string; envelopeSender: string; subject: string; externalUrl: string; textBody: string; htmlBody: string; attachments: Attachment[] };
const empty: Editing = { name: '', envelopeSender: '', subject: '', externalUrl: '', textBody: '', htmlBody: '', attachments: [] };

export function TemplatesScreen() {
  const ls = useListState();
  const { data, isLoading } = useList<Template>('templates', ls.params);
  const save = useSaveItem<Template>('templates');
  const del = useDeleteItem('templates');
  const { notify } = useToast();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [toDelete, setToDelete] = useState<Template | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const columns: Column<Template>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: 'subject', header: 'Subject', sortable: true, render: (r) => <span className="text-ink-soft">{r.subject}</span> },
    { key: 'envelopeSender', header: 'From' },
  ];

  const onSave = async () => {
    if (!editing) return;
    const { id, ...body } = editing;
    try { await save.mutateAsync({ id, body }); notify(id ? 'Template updated' : 'Template created', 'success'); setEditing(null); }
    catch (e) { notify((e as Error).message, 'error'); }
  };

  const addAttachment = async (file: File) => {
    const fd = new FormData(); fd.append('file', file); fd.append('kind', 'attachment');
    try { const a = await api.post<{ id: string; filename: string }>('/assets', fd); setEditing((e) => e ? { ...e, attachments: [...e.attachments, { assetId: a.id, filename: file.name }] } : e); }
    catch (e) { notify((e as Error).message, 'error'); } finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div>
      <PageHeader title="Email templates" subtitle="The messages your campaigns send."
        actions={<Button onClick={() => setEditing({ ...empty })}>New template</Button>} />
      <DataTable columns={columns} rows={data?.rows ?? []} rowKey={(r) => r.id} loading={isLoading} sort={ls.sort} onSort={ls.onSort}
        search={{ ...ls.search, placeholder: 'Search templates…' }}
        pagination={data ? { page: data.page, limit: data.limit, total: data.total, onPage: ls.setPage } : undefined}
        empty={{ title: 'No templates yet', body: 'Create your first email template to use in a campaign.', action: <Button onClick={() => setEditing({ ...empty })}>New template</Button> }}
        rowActions={(r) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing({ id: r.id, name: r.name, envelopeSender: r.envelopeSender, subject: r.subject, externalUrl: r.externalUrl ?? '', textBody: r.textBody, htmlBody: r.htmlBody, attachments: r.attachments ?? [] })}>Edit</Button>
            <Button variant="ghost" size="sm" onClick={() => setToDelete(r)}>Delete</Button>
          </div>
        )} />

      {editing && (
        <Drawer open onOpenChange={(o) => !o && setEditing(null)} title={editing.id ? 'Edit template' : 'New template'}
          footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={onSave} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save template'}</Button></>}>
          <div className="space-y-4">
            <div className="flex items-end justify-between gap-2">
              <Field label="Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Button variant="secondary" onClick={() => setAiOpen(true)}>✨ Generate with AI</Button>
            </div>
            <Field label="From (envelope sender)" hint="e.g. IT Support <it@yourco.com>"><Input value={editing.envelopeSender} onChange={(e) => setEditing({ ...editing, envelopeSender: e.target.value })} /></Field>
            <div className="flex items-end gap-2">
              <Field label="Subject"><Input value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} /></Field>
              <Button variant="secondary" onClick={() => setImportOpen(true)}>Import email</Button>
            </div>
            <Field label="External URL (optional)" hint="Used by the {{.ExternalURL}} token for self-hosted landing pages."><Input value={editing.externalUrl} onChange={(e) => setEditing({ ...editing, externalUrl: e.target.value })} /></Field>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Body</span>
              <Tabs tabs={[
                { value: 'html', label: 'HTML', content: <HtmlEditor withPreview={false} value={editing.htmlBody} onChange={(v) => setEditing({ ...editing, htmlBody: v })} /> },
                { value: 'text', label: 'Plain text', content: <Textarea rows={12} value={editing.textBody} onChange={(e) => setEditing({ ...editing, textBody: e.target.value })} placeholder="Plain-text fallback (optional)" /> },
                { value: 'preview', label: 'Preview', content: <PreviewFrame html={editing.htmlBody} /> },
              ]} />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Attachments</span>
              <div className="space-y-1.5">
                {editing.attachments.map((a, i) => (
                  <div key={a.assetId} className="flex items-center justify-between rounded-cg-sm border border-line bg-panel-2 px-3 py-1.5 text-sm">
                    <span className="font-mono text-xs text-ink-soft">{a.filename}</span>
                    <button className="text-muted hover:text-danger" onClick={() => setEditing({ ...editing, attachments: editing.attachments.filter((_, j) => j !== i) })}>Remove</button>
                  </div>
                ))}
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void addAttachment(f); }} />
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => fileRef.current?.click()}>Add attachment</Button>
            </div>
          </div>
        </Drawer>
      )}

      {importOpen && editing && (
        <ImportEmailModal onClose={() => setImportOpen(false)} onImported={(r) => { setEditing({ ...editing, subject: r.subject || editing.subject, htmlBody: r.html, textBody: r.text }); setImportOpen(false); notify('Email imported', 'success'); }} />
      )}

      {editing && (
        <AiTemplateModal open={aiOpen} onClose={() => setAiOpen(false)}
          onApply={(r) => setEditing((e) => e ? { ...e, subject: r.subject || e.subject, htmlBody: r.html || e.htmlBody, textBody: r.text || e.textBody } : e)} />
      )}

      <ConfirmDialog open={Boolean(toDelete)} onOpenChange={(o) => !o && setToDelete(null)} title="Delete this template?" body={toDelete?.name} destructive confirmLabel="Delete"
        onConfirm={async () => { if (toDelete) { await del.mutateAsync(toDelete.id); notify('Template deleted', 'success'); setToDelete(null); } }} />
    </div>
  );
}

function ImportEmailModal({ onClose, onImported }: { onClose: () => void; onImported: (r: { subject: string; html: string; text: string }) => void }) {
  const { notify } = useToast();
  const [source, setSource] = useState('');
  const [convertLinks, setConvertLinks] = useState(true);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { const r = await api.post<{ subject: string; html: string; text: string }>('/import/email', { source, convertLinks }); onImported(r); }
    catch (e) { notify((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Import email" description="Paste the raw source of an email (View original) to build a template."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={run} disabled={busy || !source}>{busy ? 'Importing…' : 'Import'}</Button></>}>
      <div className="space-y-3">
        <Textarea rows={12} value={source} onChange={(e) => setSource(e.target.value)} placeholder="From: ...\nSubject: ...\n\n<html>…" />
        <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={convertLinks} onChange={(e) => setConvertLinks(e.target.checked)} /> Rewrite links to the tracked landing URL</label>
      </div>
    </Modal>
  );
}
