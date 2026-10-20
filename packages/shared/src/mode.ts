export const APP_MODES = ['phishing', 'email'] as const;
export type AppMode = (typeof APP_MODES)[number];

/** Open rate as a 0–100 integer. */
export function openRate(sent: number, opened: number): number {
  return sent <= 0 ? 0 : Math.min(100, Math.round((opened / sent) * 100));
}
/** Click rate (CTR) as a 0–100 integer. */
export function clickRate(sent: number, clicked: number): number {
  return sent <= 0 ? 0 : Math.min(100, Math.round((clicked / sent) * 100));
}
