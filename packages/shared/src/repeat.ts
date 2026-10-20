export const REPEAT_OPTIONS = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const;
export type Repeat = (typeof REPEAT_OPTIONS)[number];

/** Next occurrence after `from` for a cadence. */
export function advance(from: Date, repeat: Repeat): Date {
  const d = new Date(from);
  if (repeat === 'DAILY') d.setDate(d.getDate() + 1);
  else if (repeat === 'WEEKLY') d.setDate(d.getDate() + 7);
  else if (repeat === 'MONTHLY') d.setMonth(d.getMonth() + 1);
  return d;
}
