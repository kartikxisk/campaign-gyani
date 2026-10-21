'use client';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CampaignWizard } from '@/modules/campaigns/CampaignWizard';
import { api } from '@/lib/api-client';
import type { WizardData } from '@/modules/campaigns/wizard-validate';

interface CampaignDetail {
  id: string; name: string; status: string; type: string; sendByDate: string; shuffleTemplates: boolean; repeat: string | null;
  landingPageId: string | null; sendingProfileId: string | null;
  templates: { templateId: string }[]; groups: { groupId: string }[];
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data } = useQuery<CampaignDetail>({ queryKey: ['campaigns', 'item', id], queryFn: () => api.get<CampaignDetail>(`/campaigns/${id}`) });
  if (!data) return <div className="text-sm text-muted">Loading…</div>;
  if (data.status !== 'DRAFT') return <div className="text-sm text-muted">Only draft campaigns can be edited.</div>;
  const initial: Partial<WizardData> = {
    type: (data.type as WizardData['type']) ?? 'phishing',
    name: data.name,
    groupIds: data.groups.map((g) => g.groupId),
    templateIds: data.templates.map((t) => t.templateId),
    shuffleTemplates: data.templates.length > 1 ? data.shuffleTemplates : null,
    pageId: data.landingPageId ?? '',
    smtpId: data.sendingProfileId ?? '',
    sendByDate: data.sendByDate ? toLocalInput(data.sendByDate) : '',
    repeat: (data.repeat as WizardData['repeat']) ?? 'NONE',
  };
  return <CampaignWizard editId={id} initial={initial} />;
}
