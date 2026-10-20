/**
 * Phishing-success rate as a 0–100 integer.
 * rate = clamp((max(opened, submitted) - reported) / sent * 100, 0, 100).
 * Reporting the mail reduces the success count; no sends → 0.
 */
export function successRate(sent: number, opened: number, submitted: number, reported: number): number {
  if (sent <= 0) return 0;
  const raw = Math.max(opened, submitted) - reported;
  return Math.min(100, Math.max(0, Math.round((raw / sent) * 100)));
}
