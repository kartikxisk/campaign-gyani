'use client';
import { useState } from 'react';
import { Button, Card, CardHeader, CardBody, Field, Input, useToast } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { api } from '@/lib/api-client';

export default function SettingsPage() {
  const { notify } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try { await api.post('/auth/change-password', { currentPassword: current, newPassword: next }); notify('Password changed', 'success'); setCurrent(''); setNext(''); }
    catch (e) { notify((e as Error).message, 'error'); } finally { setSaving(false); }
  };
  return (
    <div>
      <PageHeader title="Settings" subtitle="Your admin account." />
      <Card className="max-w-lg">
        <CardHeader title="Change password" />
        <CardBody className="space-y-4">
          <Field label="Current password"><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
          <Field label="New password" hint="At least 8 characters."><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
          <Button onClick={submit} disabled={saving || !current || next.length < 8}>{saving ? 'Saving…' : 'Change password'}</Button>
        </CardBody>
      </Card>
    </div>
  );
}
