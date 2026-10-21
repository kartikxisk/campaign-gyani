'use client';
import { CampaignWizard } from '@/modules/campaigns/CampaignWizard';
import { useViewMode } from '@/lib/view-mode';

export default function Page() {
  const { mode } = useViewMode();
  return <CampaignWizard initial={{ type: mode }} />;
}
