'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardHeader, CardBody, Field, Input, Textarea, useToast } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { api } from '@/lib/api-client';
import { useConfig, type AppConfig } from '@/lib/config';

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

  // Configuration
  const [cfg, setCfg] = useState<AppConfig>(config);
  useEffect(() => { setCfg(config); }, [config.brandName, config.primaryColor, config.timezone, config.emailFooter, config.logoUrl]);
  const [savingCfg, setSavingCfg] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const saveCfg = async () => {
    setSavingCfg(true);
    try {
      await api.put('/config', { brandName: cfg.brandName, primaryColor: cfg.primaryColor, timezone: cfg.timezone, emailFooter: cfg.emailFooter, logoUrl: cfg.logoUrl });
      await qc.invalidateQueries({ queryKey: ['config'] });
      notify('Configuration saved', 'success');
    } catch (e) { notify((e as Error).message, 'error'); } finally { setSavingCfg(false); }
  };

  const uploadLogo = async (file: File) => {
    const fd = new FormData(); fd.append('file', file); fd.append('kind', 'logo');
    try { const a = await api.post<{ url: string }>('/assets', fd); setCfg((c) => ({ ...c, logoUrl: a.url })); notify('Logo uploaded — save to apply', 'success'); }
    catch (e) { notify((e as Error).message, 'error'); } finally { if (logoRef.current) logoRef.current.value = ''; }
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
          <Field label="Logo">
            <div className="flex items-center gap-3">
              {cfg.logoUrl ? <img src={cfg.logoUrl} alt="" className="h-10 w-10 rounded-cg-sm object-contain" /> : <span className="flex h-10 w-10 items-center justify-center rounded-cg-sm bg-primary text-sm font-bold text-primary-ink">{initials(cfg.brandName)}</span>}
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); }} />
              <Button variant="secondary" size="sm" onClick={() => logoRef.current?.click()}>Upload</Button>
              {cfg.logoUrl && <Button variant="ghost" size="sm" onClick={() => setCfg({ ...cfg, logoUrl: null })}>Remove</Button>}
            </div>
          </Field>
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

function initials(name: string): string {
  const parts = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0]![0]! + parts[1]![0]! : (parts[0] ?? '').slice(0, 2)).toLowerCase();
}
