export interface WizardData {
  name: string;
  groupIds: string[];
  templateIds: string[];
  shuffleTemplates: boolean | null;
  pageId: string;
  smtpId: string;
  sendByDate: string;
}

export const WIZARD_STEPS = ['Name', 'Audience', 'Email', 'Landing page', 'Sending profile', 'Schedule', 'Review'] as const;

/** Returns an error string for a step, or null when the step is complete. */
export function validateStep(step: number, d: WizardData): string | null {
  switch (step) {
    case 0: return d.name.trim() ? null : 'Give the campaign a name.';
    case 1: return d.groupIds.length > 0 ? null : 'Select at least one target group.';
    case 2:
      if (d.templateIds.length === 0) return 'Select at least one email template.';
      if (d.templateIds.length > 1 && d.shuffleTemplates === null) return 'Choose whether to shuffle templates across recipients.';
      return null;
    case 3: return d.pageId ? null : 'Select a landing page.';
    case 4: return d.smtpId ? null : 'Select a sending profile.';
    case 5: return d.sendByDate ? null : 'Pick when to send.';
    default: return null;
  }
}

export function toCreatePayload(d: WizardData) {
  return {
    name: d.name.trim(),
    groupIds: d.groupIds,
    templateIds: d.templateIds,
    shuffleTemplates: d.templateIds.length > 1 ? Boolean(d.shuffleTemplates) : undefined,
    pageId: d.pageId,
    smtpId: d.smtpId,
    sendByDate: new Date(d.sendByDate).toISOString(),
  };
}
