'use client';
import * as Popover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { cn } from './cn';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function Menu({ items, label = 'More', trigger }: { items: MenuItem[]; label?: string; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {trigger ?? (
          <button className="inline-flex h-9 items-center gap-1.5 rounded-cg-sm border border-line-strong bg-panel px-3 text-sm font-medium text-ink hover:bg-surface">
            {label} <span aria-hidden className="text-muted">▾</span>
          </button>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="cg-animate-modal z-[70] min-w-44 rounded-cg border border-line bg-panel p-1 shadow-cg-pop">
          {items.map((it) => (
            <button key={it.label} disabled={it.disabled}
              onClick={() => { it.onSelect(); setOpen(false); }}
              className={cn('block w-full rounded-cg-sm px-3 py-2 text-left text-sm hover:bg-surface disabled:opacity-40',
                it.destructive ? 'text-danger' : 'text-ink')}>
              {it.label}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
