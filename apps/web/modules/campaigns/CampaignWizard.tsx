'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardBody, Combobox, Field, Input, MultiSelect, Select, useToast, cn } from '@cg/ui';
import { PageHeader } from '@/components/shell/PageHeader';
import { useAllOptions } from '@/lib/resource';
import { api } from '@/lib/api-client';
import { stepsFor, validateStep, toCreatePayload, type WizardData, type StepKey } from './wizard-validate';

const initial: WizardData = { type: 'phishing', name: '', groupIds: [], templateIds: [], shuffleTemplates: null, pageId: '', smtpId: '', sendByDate: '', repeat: 'NONE' };

export function CampaignWizard({ editId, initial: initialProp }: { editId?: string; initial?: Partial<WizardData> } = {}) {
  const router = useRouter();
  const { notify } = useToast();

  const [stepIndex, setStepIndex] = useState(0);
  const [d, setD] = useState<WizardData>({ ...initial, ...initialProp });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  const email = d.type === 'email';
  const steps = stepsFor(email);
  const key = steps[Math.min(stepIndex, steps.length - 1)]!.key;
  const groups = useAllOptions<{ id: string; name: string }>('groups', (g) => g.name);
  const templates = useAllOptions<{ id: string; name: string }>('templates', (t) => t.name);
  const pages = useAllOptions<{ id: string; name: string }>('landing-pages', (p) => p.name);
  const profiles = useAllOptions<{ id: string; name: string }>('sending-profiles', (s) => s.name);
  const nameOf = (opts: { value: string; label: string }[], id: string) => opts.find((o) => o.value === id)?.label ?? '—';

  const next = () => { const e = validateStep(key, d); if (e) { setError(e); return; } setError(null); setStepIndex((s) => Math.min(s + 1, steps.length - 1)); };
  const back = () => { setError(null); setStepIndex((s) => Math.max(s - 1, 0)); };

  const persist = async (): Promise<string> => {
    const payload = toCreatePayload(d);
    const res = editId ? await api.put<{ id: string }>(`/campaigns/${editId}`, payload) : await api.post<{ id: string }>('/campaigns', payload);
    return res.id;
  };

  const saveDraft = async () => {
    const e = validateStep('name', d);
    if (e) { setStepIndex(steps.findIndex((x) => x.key === 'name')); setError(e); return; }
    setSaving(true);
    try { const id = await persist(); notify('Draft saved', 'success'); router.push(`/campaigns/${id}`); }
    catch (e) { notify((e as Error).message, 'error'); setSaving(false); }
  };

  const launch = async () => {
    for (const st of steps) { const e = validateStep(st.key, d); if (e) { setStepIndex(steps.findIndex((x) => x.key === st.key)); setError(e); return; } }
    setLaunching(true);
    try {
      const id = await persist();
      await api.post(`/campaigns/${id}/launch`);
      notify('Campaign launched', 'success');
      router.push(`/campaigns/${id}`);
    } catch (e) { notify((e as Error).message, 'error'); setLaunching(false); }
  };

  const content: Record<StepKey, React.ReactNode> = {
    type: (
      <div className="space-y-3">
        <div className="text-sm text-ink-soft">What kind of campaign is this?</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            { v: 'phishing', title: 'Phishing simulation', body: 'Awareness test with a landing page that captures clicks and submissions.' },
            { v: 'email', title: 'Email campaign', body: 'Real email; links go to your URLs. Tracks opens and clicks only.' },
          ] as const).map((o) => (
            <button key={o.v} type="button" onClick={() => setD({ ...d, type: o.v })}
              className={cn('rounded-cg border p-4 text-left transition-colors', d.type === o.v ? 'border-primary bg-primary-soft' : 'border-line hover:border-line-strong')}>
              <div className="font-display font-semibold text-ink">{o.title}</div>
              <div className="mt-1 text-sm text-muted">{o.body}</div>
            </button>
          ))}
        </div>
      </div>
    ),
    name: <Field label="Campaign name" error={error ?? undefined}><Input autoFocus value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder={email ? 'October product update' : 'Q4 credential-harvest drill'} /></Field>,
    audience: <Field label="Target groups" error={error ?? undefined} hint="Who receives this email."><MultiSelect options={groups} value={d.groupIds} onChange={(v) => setD({ ...d, groupIds: v })} /></Field>,
    email: (
      <div className="space-y-4">
        <Field label="Email templates" error={error ?? undefined} hint={email ? 'Links in the template go to your real URLs; we track the clicks.' : undefined}><MultiSelect options={templates} value={d.templateIds} onChange={(v) => setD({ ...d, templateIds: v })} /></Field>
        {d.templateIds.length > 1 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">More than one template — how should they be used?</legend>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="shuffle" checked={d.shuffleTemplates === true} onChange={() => setD({ ...d, shuffleTemplates: true })} /> Shuffle: each recipient gets a random one</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="shuffle" checked={d.shuffleTemplates === false} onChange={() => setD({ ...d, shuffleTemplates: false })} /> Use the first template for everyone</label>
          </fieldset>
        )}
      </div>
    ),
    landing: <Field label="Landing page" error={error ?? undefined}><Combobox options={pages} value={d.pageId} onChange={(v) => setD({ ...d, pageId: v })} /></Field>,
    profile: <Field label="Sending profile" error={error ?? undefined}><Combobox options={profiles} value={d.smtpId} onChange={(v) => setD({ ...d, smtpId: v })} /></Field>,
    schedule: (
      <div className="space-y-4">
        <Field label="Send by" error={error ?? undefined} hint="A time in the past sends immediately."><Input type="datetime-local" value={d.sendByDate} onChange={(e) => setD({ ...d, sendByDate: e.target.value })} /></Field>
        <Field label="Repeat" hint="Recurring campaigns re-send on this cadence as a fresh run."><Select options={[{ value: 'NONE', label: 'Does not repeat' }, { value: 'DAILY', label: 'Daily' }, { value: 'WEEKLY', label: 'Weekly' }, { value: 'MONTHLY', label: 'Monthly' }]} value={d.repeat} onChange={(e) => setD({ ...d, repeat: e.target.value as WizardData['repeat'] })} /></Field>
      </div>
    ),
    review: (
      <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
        <dt className="text-muted">Name</dt><dd className="text-ink">{d.name}</dd>
        <dt className="text-muted">Groups</dt><dd className="text-ink">{d.groupIds.map((g) => nameOf(groups, g)).join(', ')}</dd>
        <dt className="text-muted">Templates</dt><dd className="text-ink">{d.templateIds.map((t) => nameOf(templates, t)).join(', ')}{d.templateIds.length > 1 ? ` (${d.shuffleTemplates ? 'shuffled' : 'first only'})` : ''}</dd>
        {!email && <><dt className="text-muted">Landing</dt><dd className="text-ink">{nameOf(pages, d.pageId)}</dd></>}
        <dt className="text-muted">Profile</dt><dd className="text-ink">{nameOf(profiles, d.smtpId)}</dd>
        <dt className="text-muted">Send by</dt><dd className="text-ink">{d.sendByDate || '—'}</dd>
        {d.repeat !== 'NONE' && <><dt className="text-muted">Repeat</dt><dd className="text-ink">{d.repeat.toLowerCase()}</dd></>}
      </dl>
    ),
  };

  return (
    <div>
      <PageHeader title={editId ? 'Edit campaign' : 'New campaign'} subtitle={`${steps.length} quick steps from idea to launch.`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <Card>
          <div className="flex gap-1 overflow-x-auto border-b border-line px-4 py-3">
            {steps.map((st, i) => (
              <button key={st.key} type="button" onClick={() => i <= stepIndex && setStepIndex(i)}
                className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-medium', i === stepIndex ? 'bg-primary text-primary-ink' : i < stepIndex ? 'bg-primary-soft text-ink' : 'text-muted')}>
                {i + 1}. {st.label}
              </button>
            ))}
          </div>
          <CardBody className="min-h-[320px]">{content[key]}</CardBody>
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <Button variant="ghost" onClick={back} disabled={stepIndex === 0}>Back</Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={saveDraft} disabled={saving}>{saving ? 'Saving…' : 'Save as draft'}</Button>
              {stepIndex < steps.length - 1
                ? <Button onClick={next}>Continue</Button>
                : <Button onClick={launch} disabled={launching}>{launching ? 'Launching…' : 'Launch campaign'}</Button>}
            </div>
          </div>
        </Card>
        <aside className="hidden lg:block">
          <Card><CardBody>
            <div className="text-xs font-medium uppercase tracking-wide text-muted">Summary</div>
            <div className="mt-3 space-y-2 text-sm">
              <div><span className="text-muted">Name</span><div className="text-ink">{d.name || '—'}</div></div>
              <div><span className="text-muted">Audience</span><div className="text-ink">{d.groupIds.length} group(s)</div></div>
              <div><span className="text-muted">Templates</span><div className="text-ink">{d.templateIds.length}</div></div>
            </div>
          </CardBody></Card>
        </aside>
      </div>
    </div>
  );
}
