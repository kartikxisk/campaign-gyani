export interface WizardData {
  name: string;
  groupIds: string[];
  templateIds: string[];
  shuffleTemplates: boolean | null;
  pageId: string;
  smtpId: string;
  sendByDate: string;
}

export type StepKey = 'name' | 'audience' | 'email' | 'landing' | 'profile' | 'schedule' | 'review';

export interface Step { key: StepKey; label: string; }

const ALL: Record<StepKey, string> = {
  name: 'Name', audience: 'Audience', email: 'Email', landing: 'Landing page',
  profile: 'Sending profile', schedule: 'Schedule', review: 'Review',
};

export function stepsFor(email: boolean): Step[] {
  const keys: StepKey[] = email
    ? ['name', 'audience', 'email', 'profile', 'schedule', 'review']
    : ['name', 'audience', 'email', 'landing', 'profile', 'schedule', 'review'];
  return keys.map((key) => ({ key, label: ALL[key] }));
}

/** Returns an error string for a step, or null when the step is complete. */
export function validateStep(key: StepKey, d: WizardData): string | null {
  switch (key) {
    case 'name': return d.name.trim() ? null : 'Give the campaign a name.';
    case 'audience': return d.groupIds.length > 0 ? null : 'Select at least one target group.';
    case 'email':
      if (d.templateIds.length === 0) return 'Select at least one email template.';
      if (d.templateIds.length > 1 && d.shuffleTemplates === null) return 'Choose whether to shuffle templates across recipients.';
      return null;
    case 'landing': return d.pageId ? null : 'Select a landing page.';
    case 'profile': return d.smtpId ? null : 'Select a sending profile.';
    case 'schedule': return d.sendByDate ? null : 'Pick when to send.';
    case 'review': return null;
  }
}

export function toCreatePayload(d: WizardData, email: boolean) {
  return {
    name: d.name.trim(),
    groupIds: d.groupIds,
    templateIds: d.templateIds,
    shuffleTemplates: d.templateIds.length > 1 ? Boolean(d.shuffleTemplates) : undefined,
    pageId: email ? undefined : d.pageId,
    smtpId: d.smtpId,
    sendByDate: new Date(d.sendByDate).toISOString(),
  };
}
