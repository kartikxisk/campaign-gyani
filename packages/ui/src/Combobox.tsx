import * as Popover from '@radix-ui/react-popover';
import { useMemo, useState } from 'react';
import { cn } from './cn';

export interface Option { value: string; label: string; hint?: string; }

interface BaseProps {
  options: Option[];
  placeholder?: string;
  onSearch?: (q: string) => void;
  className?: string;
  id?: string;
}

function useFiltered(options: Option[], q: string, external: boolean): Option[] {
  return useMemo(() => {
    if (external || !q) return options;
    const needle = q.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(needle));
  }, [options, q, external]);
}

export function Combobox({ options, value, onChange, placeholder = 'Select…', onSearch, className, id }: BaseProps & { value?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useFiltered(options, q, Boolean(onSearch));
  const selected = options.find((o) => o.value === value);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button id={id} type="button" className={cn('flex h-10 w-full items-center justify-between rounded-cg-sm border border-line-strong bg-panel px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50', className)}>
          <span className={selected ? '' : 'text-muted'}>{selected?.label ?? placeholder}</span>
          <span aria-hidden className="text-muted">▾</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className="z-[70] w-[var(--radix-popover-trigger-width)] rounded-cg border border-line bg-panel p-1 shadow-cg-pop">
          <input autoFocus placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); onSearch?.(e.target.value); }}
            className="mb-1 w-full rounded-cg-sm border border-line bg-surface px-2 py-1.5 text-sm focus:outline-none" />
          <ul role="listbox" className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? <li className="px-2 py-2 text-sm text-muted">No matches</li> : filtered.map((o) => (
              <li key={o.value}>
                <button type="button" role="option" aria-selected={o.value === value}
                  onClick={() => { onChange(o.value); setOpen(false); setQ(''); }}
                  className={cn('flex w-full items-center justify-between rounded-cg-sm px-2 py-1.5 text-left text-sm hover:bg-surface', o.value === value && 'bg-primary-soft text-ink')}>
                  <span>{o.label}</span>{o.hint ? <span className="text-xs text-muted">{o.hint}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function MultiSelect({ options, value, onChange, placeholder = 'Select…', onSearch, className, id }: BaseProps & { value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useFiltered(options, q, Boolean(onSearch));
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const labels = options.filter((o) => value.includes(o.value)).map((o) => o.label);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button id={id} type="button" className={cn('flex min-h-10 w-full items-center justify-between gap-2 rounded-cg-sm border border-line-strong bg-panel px-3 py-1.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50', className)}>
          <span className={cn('flex flex-wrap gap-1', labels.length === 0 && 'text-muted')}>
            {labels.length === 0 ? placeholder : labels.map((l) => <span key={l} className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-ink">{l}</span>)}
          </span>
          <span aria-hidden className="text-muted">▾</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className="z-[70] w-[var(--radix-popover-trigger-width)] rounded-cg border border-line bg-panel p-1 shadow-cg-pop">
          <input autoFocus placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); onSearch?.(e.target.value); }}
            className="mb-1 w-full rounded-cg-sm border border-line bg-surface px-2 py-1.5 text-sm focus:outline-none" />
          <ul role="listbox" aria-multiselectable className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? <li className="px-2 py-2 text-sm text-muted">No matches</li> : filtered.map((o) => (
              <li key={o.value}>
                <button type="button" role="option" aria-selected={value.includes(o.value)} onClick={() => toggle(o.value)}
                  className={cn('flex w-full items-center gap-2 rounded-cg-sm px-2 py-1.5 text-left text-sm hover:bg-surface', value.includes(o.value) && 'bg-primary-soft')}>
                  <span className={cn('flex h-4 w-4 items-center justify-center rounded border', value.includes(o.value) ? 'border-primary bg-primary text-primary-ink' : 'border-line-strong')}>{value.includes(o.value) ? '✓' : ''}</span>
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
