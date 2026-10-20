'use client';
import { use } from 'react';
import { CampaignReport } from '@/modules/campaigns/CampaignReport';
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CampaignReport id={id} />;
}
