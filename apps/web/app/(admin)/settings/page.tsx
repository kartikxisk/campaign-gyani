'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardHeader, CardBody, Field, Input, Textarea, useToast } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { api } from '@/lib/api-client';
import { useConfig, type AppConfig } from '@/lib/config';

type ImageKey = 'logoUrl' | 'faviconUrl';
type FormConfig = Omit<AppConfig, ImageKey>;
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,image/x-icon,image/vnd.microsoft.icon,.ico';

export default function SettingsPage() {
  const { notify } = useToast();
  const qc = useQueryClient();
  const config = useConfig();

  // Password
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const changePw = async () => {
    setSavingPw(true);
    try { await api.post('/auth/change-password', { currentPassword: current, newPassword: next }); notify('Password changed', 'success'); setCurrent(''); setNext(''); }
    catch (e) { notify((e as Error).message, 'error'); } finally { setSavingPw(false); }
  };

  // Configuration — text fields save together; logo and favicon apply on upload.
  const [cfg, setCfg] = useState<FormConfig>(config);
  useEffect(() => { setCfg(config); }, [config.brandName, config.primaryColor, config.timezone, config.emailFooter]);
  const [savingCfg, setSavingCfg] = useState(false);

  const saveCfg = async () => {
    setSavingCfg(true);
    try {
      const saved = await api.put<AppConfig>('/config', { brandName: cfg.brandName, primaryColor: cfg.primaryColor, timezone: cfg.timezone, emailFooter: cfg.emailFooter });
      qc.setQueryData(['config'], saved);
      notify('Configuration saved', 'success');
    } catch (e) { notify((e as Error).message, 'error'); }
    finally { setSavingCfg(false); }
  };

  const setImage = async (key: ImageKey, url: string | null) => {
    const saved = await api.put<AppConfig>('/config', { [key]: url });
    qc.setQueryData(['config'], saved);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Your account and the workspace." />

      <Card>
        <CardHeader title="Branding & configuration" subtitle="Applies across the console and public pages." />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label="Brand name"><Input value={cfg.brandName} onChange={(e) => setCfg({ ...cfg, brandName: e.target.value })} /></Field>
          <Field label="Primary color">
            <div className="flex items-center gap-2">
              <input type="color" value={cfg.primaryColor} onChange={(e) => setCfg({ ...cfg, primaryColor: e.target.value })} className="h-10 w-12 rounded-cg-sm border border-line-strong bg-panel" />
              <Input value={cfg.primaryColor} onChange={(e) => setCfg({ ...cfg, primaryColor: e.target.value })} />
            </div>
          </Field>
          <Field label="Timezone" hint="IANA name, e.g. America/New_York"><Input value={cfg.timezone} onChange={(e) => setCfg({ ...cfg, timezone: e.target.value })} /></Field>
          <ImageField label="Logo" hint="PNG, JPEG, GIF or WebP. Shown in the sidebar and on the sign-in page."
            url={config.logoUrl} onChange={(url) => setImage('logoUrl', url)} />
          <ImageField label="Favicon" hint="Square PNG or ICO, 32×32 or larger. Shown in the browser tab."
            url={config.faviconUrl} onChange={(url) => setImage('faviconUrl', url)} />
          <div className="md:col-span-2"><Field label="Email footer" hint="Appended to campaign emails (plain HTML)."><Textarea rows={3} value={cfg.emailFooter} onChange={(e) => setCfg({ ...cfg, emailFooter: e.target.value })} /></Field></div>
          <div><Button onClick={saveCfg} disabled={savingCfg}>{savingCfg ? 'Saving…' : 'Save configuration'}</Button></div>
        </CardBody>
      </Card>

      <Card className="max-w-lg">
        <CardHeader title="Change password" />
        <CardBody className="space-y-4">
          <Field label="Current password"><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
          <Field label="New password" hint="At least 8 characters."><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
          <Button onClick={changePw} disabled={savingPw || !current || next.length < 8}>{savingPw ? 'Saving…' : 'Change password'}</Button>
        </CardBody>
      </Card>
    </div>
  );
}

function ImageField({ label, hint, url, onChange }: { label: string; hint: string; url: string | null; onChange: (url: string | null) => Promise<void> }) {
  const { notify } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);

  const run = async (action: 'upload' | 'remove', work: () => Promise<void>, done: string) => {
    setBusy(action);
    try { await work(); notify(done, 'success'); }
    catch (e) { notify((e as Error).message, 'error'); }
    finally { setBusy(null); if (ref.current) ref.current.value = ''; }
  };
  const upload = (file: File) => run('upload', async () => {
    const fd = new FormData(); fd.append('file', file); fd.append('kind', 'logo');
    const asset = await api.post<{ url: string }>('/assets', fd);
    await onChange(asset.url);
  }, `${label} updated`);

  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        {url
          ? <img src={url} alt="" className="h-10 w-10 rounded-cg-sm object-contain" />
          : <span aria-hidden className="h-10 w-10 rounded-cg-sm border border-dashed border-line-strong" />}
        <input ref={ref} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
        <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => ref.current?.click()}>{busy === 'upload' ? 'Uploading…' : url ? 'Replace' : 'Upload'}</Button>
        {url && <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => run('remove', () => onChange(null), `${label} removed`)}>{busy === 'remove' ? 'Removing…' : 'Remove'}</Button>}
      </div>
    </Field>
  );
}
