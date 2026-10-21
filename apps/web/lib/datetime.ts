'use client';
import { useConfig } from './config';

export function fmtDateTime(iso: string | null | undefined, tz: string): string {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleString(); }
}
export function fmtDate(iso: string | null | undefined, tz: string): string {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: tz }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleDateString(); }
}
export function useDateFmt() {
  const { timezone } = useConfig();
  return {
    dateTime: (iso: string | null | undefined) => fmtDateTime(iso, timezone),
    date: (iso: string | null | undefined) => fmtDate(iso, timezone),
    timezone,
  };
}
