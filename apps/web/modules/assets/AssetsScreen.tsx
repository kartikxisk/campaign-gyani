'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button, Card, EmptyState, Select, ConfirmDialog, useToast } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { api } from '@/lib/api-client';

interface Asset { id: string; filename: string; url: string; mimetype: string; kind: string; size: number; }

export function AssetsScreen() {
  const qc = useQueryClient();
  const { notify } = useToast();
  const { data } = useQuery<Asset[]>({ queryKey: ['assets'], queryFn: () => api.get<Asset[]>('/assets') });
  const [kind, setKind] = useState('image');
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<Asset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);
    try { await api.post('/assets', fd); notify('Uploaded', 'success'); qc.invalidateQueries({ queryKey: ['assets'] }); }
    catch (e) { notify((e as Error).message, 'error'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const copy = (url: string) => { navigator.clipboard?.writeText(url); notify('URL copied', 'success'); };

  return (
    <div>
      <PageHeader title="Assets" subtitle="Logos and images you can reference in templates and landing pages." />
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3 p-5">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">Kind</span>
            <Select options={[{ value: 'logo', label: 'Logo' }, { value: 'image', label: 'Image' }, { value: 'attachment', label: 'Attachment' }]} value={kind} onChange={(e) => setKind(e.target.value)} />
          </label>
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload file'}</Button>
          <span className="text-xs text-muted">Images: PNG, JPEG, GIF or WebP, up to 15&nbsp;MB.</span>
        </div>
      </Card>
      {(data?.length ?? 0) === 0 ? (
        <EmptyState title="No assets yet" body="Upload a logo or image to use in your emails." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data!.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <div className="flex h-32 items-center justify-center border-b border-line bg-surface">
                {a.mimetype.startsWith('image/') ? <img src={a.url} alt={a.filename} className="max-h-full max-w-full object-contain" /> : <span className="font-mono text-xs text-muted">{a.mimetype}</span>}
              </div>
              <div className="space-y-2 p-3">
                <div className="truncate font-mono text-xs text-ink-soft" title={a.filename}>{a.filename}</div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => copy(a.url)}>Copy URL</Button>
                  <Button variant="ghost" size="sm" onClick={() => setToDelete(a)}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog open={Boolean(toDelete)} onOpenChange={(o) => !o && setToDelete(null)} title="Delete this asset?" body={toDelete?.filename} destructive confirmLabel="Delete"
        onConfirm={async () => { if (toDelete) { await api.del(`/assets/${toDelete.id}`); notify('Deleted', 'success'); qc.invalidateQueries({ queryKey: ['assets'] }); setToDelete(null); } }} />
    </div>
  );
}
