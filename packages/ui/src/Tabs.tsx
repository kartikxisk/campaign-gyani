import * as RTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { cn } from './cn';

export function Tabs({ tabs, value, onValueChange, className }: {
  tabs: { value: string; label: string; content: ReactNode }[];
  value?: string; onValueChange?: (v: string) => void; className?: string;
}) {
  return (
    <RTabs.Root value={value} onValueChange={onValueChange} defaultValue={tabs[0]?.value} className={className}>
      <RTabs.List className="flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <RTabs.Trigger key={t.value} value={t.value}
            className="relative px-3 py-2 text-sm font-medium text-muted data-[state=active]:text-ink data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            {t.label}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {tabs.map((t) => (
        <RTabs.Content key={t.value} value={t.value} className="pt-4 focus-visible:outline-none">{t.content}</RTabs.Content>
      ))}
    </RTabs.Root>
  );
}
