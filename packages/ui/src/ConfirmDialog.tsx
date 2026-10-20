import * as RDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { Button } from './Button';

export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel = 'Confirm', destructive = false, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; body?: ReactNode; confirmLabel?: string; destructive?: boolean; onConfirm: () => void;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="cg-animate-overlay fixed inset-0 z-40 bg-ink/40" />
        <RDialog.Content className="cg-animate-modal fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-cg border border-line bg-panel p-5 shadow-cg-pop focus:outline-none">
          <RDialog.Title className="font-display text-base font-semibold text-ink">{title}</RDialog.Title>
          {body ? <RDialog.Description className="mt-2 text-sm text-ink-soft">{body}</RDialog.Description> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant={destructive ? 'danger' : 'primary'} size="sm" onClick={() => { onConfirm(); onOpenChange(false); }}>{confirmLabel}</Button>
          </div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
