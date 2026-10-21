'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardHeader, CardBody, Field, Input, Select, useToast } from '@cg/ui';
import { api } from '@/lib/api-client';

interface AiModel { id: string; label: string }
interface AiProvider { id: string; label: string; defaultModel: string; models: AiModel[] }
interface AiConfig { provider: string; model: string; hasKey: boolean; providers: AiProvider[] }

export function AiSettings() {
  const { notify } = useToast();
  const cfg = useQuery<AiConfig>({ queryKey: ['ai', 'config'], queryFn: () => api.get<AiConfig>('/ai/config') });

  const [provider, setProvider] = useState('anthropic');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (cfg.data) { setProvider(cfg.data.provider); setModel(cfg.data.model); }
  }, [cfg.data?.provider, cfg.data?.model]);

  if (!cfg.data) return null;
  const providers = cfg.data.providers;
  const active = providers.find((p) => p.id === provider) ?? providers[0]!;

  const onProvider = (id: string) => {
    setProvider(id);
    const p = providers.find((x) => x.id === id);
    if (p) setModel(p.defaultModel); // reset model to the new provider's default
  };

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, string> = { provider, model };
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      const saved = await api.put<AiConfig>('/ai/config', body);
      setApiKey('');
      cfg.refetch();
      notify(saved.hasKey ? 'AI settings saved' : 'AI settings saved — add an API key to enable generation', 'success');
    } catch (e) { notify((e as Error).message, 'error'); }
    finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true);
    try { await api.post('/ai/test'); notify('AI key works', 'success'); }
    catch (e) { notify((e as Error).message, 'error'); }
    finally { setTesting(false); }
  };

  return (
    <Card>
      <CardHeader title="AI provider" subtitle="Connect Claude, ChatGPT or Gemini to generate email templates." />
      <CardBody className="grid gap-4 md:grid-cols-2">
        <Field label="Provider">
          <Select options={providers.map((p) => ({ value: p.id, label: p.label }))} value={provider} onChange={(e) => onProvider(e.target.value)} />
        </Field>
        <Field label="Model" hint="Pick a suggested model or type any model id the provider supports.">
          <>
            <Input list="ai-models" value={model} onChange={(e) => setModel(e.target.value)} placeholder={active.defaultModel} />
            <datalist id="ai-models">{active.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</datalist>
          </>
        </Field>
        <div className="md:col-span-2">
          <Field label="API key" hint={cfg.data.hasKey ? 'A key is stored. Leave blank to keep it, or enter a new one to replace.' : 'Stored encrypted; never shown again.'}>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={cfg.data.hasKey ? '•••••••• (stored)' : `${active.label} API key`} />
          </Field>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save AI settings'}</Button>
          <Button variant="secondary" onClick={test} disabled={testing || !cfg.data.hasKey}>{testing ? 'Testing…' : 'Test key'}</Button>
        </div>
      </CardBody>
    </Card>
  );
}
