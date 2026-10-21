'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button, DataTable, Drawer, Field, Input, ConfirmDialog, useToast, type Column } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { useListState } from '@/lib/use-list-state';
import { useList, useSaveItem, useDeleteItem } from '@/lib/resource';
import { api } from '@/lib/api-client';

interface Group { id: string; name: string; numTargets: number; }
interface Target { id: string; email: string; firstName: string; lastName: string; position: string; }

export function GroupsScreen() {
  const ls = useListState();
  const { data, isLoading } = useList<Group>('groups', ls.params);
  const save = useSaveItem<Group>('groups');
  const del = useDeleteItem('groups');
  const { notify } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState<null | { id?: string; name: string }>(null);
  const [manage, setManage] = useState<Group | null>(null);
  const [toDelete, setToDelete] = useState<Group | null>(null);

  const columns: Column<Group>[] = [
    { key: 'name', header: 'Group', sortable: true, render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: 'numTargets', header: 'Targets', align: 'right', render: (r) => <span className="font-mono tabular-nums">{r.numTargets}</span> },
  ];

  return (
    <div>
      <PageHeader title="Target groups" subtitle="The people a campaign is sent to."
        actions={<Button onClick={() => setName({ name: '' })}>New group</Button>} />
      <DataTable columns={columns} rows={data?.rows ?? []} rowKey={(r) => r.id} loading={isLoading} sort={ls.sort} onSort={ls.onSort}
        search={{ ...ls.search, placeholder: 'Search groups…' }}
        pagination={data ? { page: data.page, limit: data.limit, total: data.total, onPage: ls.setPage } : undefined}
        empty={{ title: 'No groups yet', body: 'Create a group, then add or import its targets.', action: <Button onClick={() => setName({ name: '' })}>New group</Button> }}
        rowActions={(r) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setManage(r)}>Manage</Button>
            <Button variant="ghost" size="sm" onClick={() => setToDelete(r)}>Delete</Button>
          </div>
        )} />
      {name && (
        <Drawer open onOpenChange={(o) => !o && setName(null)} title={name.id ? 'Rename group' : 'New group'}
          footer={<><Button variant="secondary" onClick={() => setName(null)}>Cancel</Button>
            <Button onClick={async () => { await save.mutateAsync({ id: name.id, body: { name: name.name } }); notify('Saved', 'success'); setName(null); }} disabled={!name.name}>Save</Button></>}>
          <Field label="Group name"><Input value={name.name} onChange={(e) => setName({ ...name, name: e.target.value })} /></Field>
        </Drawer>
      )}
      {manage && <ManageTargets group={manage} onClose={() => { setManage(null); qc.invalidateQueries({ queryKey: ['groups'] }); }} />}
      <ConfirmDialog open={Boolean(toDelete)} onOpenChange={(o) => !o && setToDelete(null)} title="Delete this group?" body={`${toDelete?.name} and its targets will be removed.`} destructive confirmLabel="Delete"
        onConfirm={async () => { if (toDelete) { await del.mutateAsync(toDelete.id); notify('Group deleted', 'success'); setToDelete(null); } }} />
    </div>
  );
}

function ManageTargets({ group, onClose }: { group: Group; onClose: () => void }) {
  const { notify } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: targets } = useQuery<Target[]>({ queryKey: ['groups', group.id, 'targets'], queryFn: () => api.get<Target[]>(`/groups/${group.id}/targets`) });
  const [row, setRow] = useState({ email: '', firstName: '', lastName: '', position: '' });
  const refresh = () => qc.invalidateQueries({ queryKey: ['groups', group.id, 'targets'] });

  const add = async () => {
    try { await api.post(`/groups/${group.id}/targets`, row); setRow({ email: '', firstName: '', lastName: '', position: '' }); notify('Target added', 'success'); refresh(); }
    catch (e) { notify((e as Error).message, 'error'); }
  };
  const importCsv = async (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    try { const r = await api.post<{ inserted: number; skipped: unknown[] }>(`/groups/${group.id}/targets/csv`, fd); notify(`Imported ${r.inserted}, skipped ${r.skipped.length}`, 'success'); refresh(); }
    catch (e) { notify((e as Error).message, 'error'); } finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  const columns: Column<Target>[] = [
    { key: 'email', header: 'Email', mono: true },
    { key: 'firstName', header: 'First' },
    { key: 'lastName', header: 'Last' },
    { key: 'position', header: 'Role' },
  ];

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()} title={`Manage “${group.name}”`} description={`${targets?.length ?? 0} ${targets?.length === 1 ? 'target' : 'targets'}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Email" value={row.email} onChange={(e) => setRow({ ...row, email: e.target.value })} />
          <Input placeholder="Role" value={row.position} onChange={(e) => setRow({ ...row, position: e.target.value })} />
          <Input placeholder="First name" value={row.firstName} onChange={(e) => setRow({ ...row, firstName: e.target.value })} />
          <Input placeholder="Last name" value={row.lastName} onChange={(e) => setRow({ ...row, lastName: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={add} disabled={!row.email}>Add target</Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); }} />
          <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>Import CSV</Button>
        </div>
        <p className="text-xs text-muted">CSV header: <span className="font-mono">firstName,lastName,email,position</span></p>
        <DataTable columns={columns} rows={targets ?? []} rowKey={(r) => r.id}
          empty={{ title: 'No targets yet', body: 'Add one above or import a CSV.' }}
          rowActions={(r) => <Button variant="ghost" size="sm" onClick={async () => { await api.del(`/targets/${r.id}`); refresh(); }}>Remove</Button>} />
      </div>
    </Drawer>
  );
}
