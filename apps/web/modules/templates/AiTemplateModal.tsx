'use client';
import { useState } from 'react';
import { Modal, Button, Field, Textarea, useToast } from '@cg/ui';
import { api } from '@/lib/api-client';

interface Generated { subject: string; html: string; text: string }

export function AiTemplateModal({ open, onClose, onApply }: {
  open: boolean;
  onClose: () => void;
  onApply: (r: Generated) => void;
}) {
  const { notify } = useToast();
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      const body: Record<string, string> = { prompt: prompt.trim() };
      if (context.trim()) body.context = context.trim();
      const r = await api.post<Generated>('/ai/generate-template', body);
      onApply(r);
      notify('Template generated — review before saving', 'success');
      onClose();
    } catch (e) { notify((e as Error).message, 'error'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Generate with AI"
      description="Describe the email. The configured AI provider writes the subject and body; tokens like {{.FirstName}} are preserved."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={generate} disabled={busy || !prompt.trim()}>{busy ? 'Generating…' : 'Generate'}</Button></>}>
      <div className="space-y-4">
        <Field label="What should the email say?">
          <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. An urgent IT password-reset notice with a button linking to {{.URL}}" />
        </Field>
        <Field label="Context (optional)" hint="Company, sender persona, tone, branding details.">
          <Textarea rows={3} value={context} onChange={(e) => setContext(e.target.value)} placeholder="e.g. Acme Corp IT department, formal tone, references the Okta portal" />
        </Field>
        <p className="text-xs text-muted">Needs an AI provider + API key configured in Settings.</p>
      </div>
    </Modal>
  );
}
