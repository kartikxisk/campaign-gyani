'use client';
import { useEffect, useState } from 'react';
import { Button, DataTable, Drawer, Field, Input, Select, ConfirmDialog, useToast, type Column } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { useListState } from '@/lib/use-list-state';
import { useList, useSaveItem, useDeleteItem } from '@/lib/resource';
import { api } from '@/lib/api-client';

interface Profile { id: string; name: string; provider: string; fromAddress: string; host: string; port: number; username: string; rateLimit: number; maxConnections: number; maxMessages: number; pool: boolean; ignoreCertErrors: boolean; headers?: Header[]; }
type Preset = { host?: string; port: number; rateLimit: number; maxConnections: number; maxMessages: number };
const PROVIDERS = [
  { value: 'gmail', label: 'Gmail / Google Workspace' }, { value: 'o365', label: 'Microsoft 365 / Outlook' },
  { value: 'ses', label: 'Amazon SES' }, { value: 'sendgrid', label: 'SendGrid' }, { value: 'mailgun', label: 'Mailgun' }, { value: 'custom', label: 'Custom SMTP' },
];
type Header = { key: string; value: string };
const empty = { name: '', provider: 'custom', fromAddress: '', host: '', port: 587, username: '', password: '', rateLimit: 10, maxConnections: 5, maxMessages: 100, pool: true, ignoreCertErrors: false, headers: [] as Header[] };

export function SendingProfilesScreen() {
  const ls = useListState();
  const { data, isLoading } = useList<Profile>('sending-profiles', ls.params);
  const save = useSaveItem<Profile>('sending-profiles');
  const del = useDeleteItem('sending-profiles');
  const { notify } = useToast();
  const [editing, setEditing] = useState<null | (typeof empty & { id?: string })>(null);
  const [toDelete, setToDelete] = useState<Profile | null>(null);
  const [presets, setPresets] = useState<Record<string, Preset>>({});
  const [testTo, setTestTo] = useState('');

  useEffect(() => { api.get<Record<string, Preset>>('/sending-profiles/providers').then(setPresets).catch(() => undefined); }, []);

  const applyPreset = (provider: string) => {
    const p = presets[provider];
    setEditing((e) => (e ? { ...e, provider, host: p?.host ?? e.host, port: p?.port ?? e.port, rateLimit: p?.rateLimit ?? e.rateLimit, maxConnections: p?.maxConnections ?? e.maxConnections, maxMessages: p?.maxMessages ?? e.maxMessages } : e));
  };

  const columns: Column<Profile>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: 'provider', header: 'Provider' },
    { key: 'host', header: 'Host', mono: true, render: (r) => <span className="font-mono text-ink-soft">{r.host}:{r.port}</span> },
  ];

  const onSave = async () => {
    if (!editing) return;
    const { id, ...body } = editing;
    try { await save.mutateAsync({ id, body }); notify(id ? 'Profile updated' : 'Profile created', 'success'); setEditing(null); }
    catch (e) { notify((e as Error).message, 'error'); }
  };

  const sendTest = async () => {
    if (!editing || !testTo) return;
    try {
      const path = editing.id ? `/sending-profiles/${editing.id}/test` : '/sending-profiles/test';
      await api.post(path, editing.id ? { to: testTo } : { to: testTo, host: editing.host, port: editing.port, username: editing.username, password: editing.password, fromAddress: editing.fromAddress });
      notify('Test message sent', 'success');
    } catch (e) { notify((e as Error).message, 'error'); }
  };

  return (
    <div>
      <PageHeader title="Sending profiles" subtitle="SMTP servers your campaigns send through."
        actions={<Button onClick={() => setEditing({ ...empty })}>New profile</Button>} />
      <DataTable columns={columns} rows={data?.rows ?? []} rowKey={(r) => r.id} loading={isLoading} sort={ls.sort} onSort={ls.onSort}
        search={{ ...ls.search, placeholder: 'Search profiles…' }}
        pagination={data ? { page: data.page, limit: data.limit, total: data.total, onPage: ls.setPage } : undefined}
        empty={{ title: 'No sending profiles yet', body: 'Add an SMTP profile to send campaign mail.', action: <Button onClick={() => setEditing({ ...empty })}>New profile</Button> }}
        rowActions={(r) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing({ id: r.id, name: r.name, provider: r.provider, fromAddress: r.fromAddress, host: r.host, port: r.port, username: r.username, password: '', rateLimit: r.rateLimit, maxConnections: r.maxConnections, maxMessages: r.maxMessages, pool: r.pool, ignoreCertErrors: r.ignoreCertErrors, headers: r.headers ?? [] })}>Edit</Button>
            <Button variant="ghost" size="sm" onClick={() => setToDelete(r)}>Delete</Button>
          </div>
        )} />
      {editing && (
        <Drawer open onOpenChange={(o) => !o && setEditing(null)} title={editing.id ? 'Edit sending profile' : 'New sending profile'}
          footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={onSave} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button></>}>
          <div className="space-y-4">
            <Field label="Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Provider"><Select options={PROVIDERS} value={editing.provider} onChange={(e) => applyPreset(e.target.value)} /></Field>
            <Field label="From address"><Input value={editing.fromAddress} onChange={(e) => setEditing({ ...editing, fromAddress: e.target.value })} placeholder="noreply@yourco.com" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Host"><Input value={editing.host} onChange={(e) => setEditing({ ...editing, host: e.target.value })} /></Field>
              <Field label="Port"><Input type="number" value={editing.port} onChange={(e) => setEditing({ ...editing, port: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Username"><Input value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} /></Field>
            <Field label="Password" hint={editing.id ? 'Leave blank to keep the stored password.' : undefined}><Input type="password" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Rate / sec"><Input type="number" value={editing.rateLimit} onChange={(e) => setEditing({ ...editing, rateLimit: Number(e.target.value) })} /></Field>
              <Field label="Max conn"><Input type="number" value={editing.maxConnections} onChange={(e) => setEditing({ ...editing, maxConnections: Number(e.target.value) })} /></Field>
              <Field label="Msgs / conn"><Input type="number" value={editing.maxMessages} onChange={(e) => setEditing({ ...editing, maxMessages: Number(e.target.value) })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={editing.pool} onChange={(e) => setEditing({ ...editing, pool: e.target.checked })} /> Reuse connections (pool)</label>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Custom headers</span>
              <div className="space-y-1.5">
                {editing.headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input placeholder="Header" value={h.key} onChange={(e) => { const hs = [...editing.headers]; hs[i] = { key: e.target.value, value: hs[i]?.value ?? '' }; setEditing({ ...editing, headers: hs }); }} />
                    <Input placeholder="Value" value={h.value} onChange={(e) => { const hs = [...editing.headers]; hs[i] = { key: hs[i]?.key ?? '', value: e.target.value }; setEditing({ ...editing, headers: hs }); }} />
                    <button className="shrink-0 px-1 text-muted hover:text-danger" onClick={() => setEditing({ ...editing, headers: editing.headers.filter((_, j) => j !== i) })} aria-label="Remove header">✕</button>
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => setEditing({ ...editing, headers: [...editing.headers, { key: '', value: '' }] })}>Add header</Button>
            </div>
            <div className="rounded-cg border border-line bg-surface/60 p-3">
              <div className="mb-2 text-sm font-medium text-ink">Send a test message</div>
              <div className="flex items-end gap-2">
                <Field label="To"><Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@yourco.com" /></Field>
                <Button variant="secondary" onClick={sendTest} disabled={!testTo}>Send test</Button>
              </div>
            </div>
          </div>
        </Drawer>
      )}
      <ConfirmDialog open={Boolean(toDelete)} onOpenChange={(o) => !o && setToDelete(null)} title="Delete this profile?" body={toDelete?.name} destructive confirmLabel="Delete"
        onConfirm={async () => { if (toDelete) { await del.mutateAsync(toDelete.id); notify('Profile deleted', 'success'); setToDelete(null); } }} />
    </div>
  );
}
