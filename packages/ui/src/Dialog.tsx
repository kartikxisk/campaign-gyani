import * as RDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from './cn';

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

const overlay = 'cg-animate-overlay fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px]';

export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md' }: BaseProps & { size?: 'md' | 'lg' | 'xl' }) {
  const widths = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const;
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className={overlay} />
        <RDialog.Content className={cn('cg-animate-modal fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-cg border border-line bg-panel shadow-cg-pop focus:outline-none', widths[size])}>
          <div className="flex items-start justify-between border-b border-line px-5 py-4">
            <div>
              <RDialog.Title className="font-display text-base font-semibold text-ink">{title}</RDialog.Title>
              {description ? <RDialog.Description className="mt-0.5 text-sm text-muted">{description}</RDialog.Description> : null}
            </div>
            <RDialog.Close className="rounded-cg-sm p-1 text-muted hover:bg-surface hover:text-ink" aria-label="Close">✕</RDialog.Close>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div> : null}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export function Drawer({ open, onOpenChange, title, description, children, footer }: BaseProps) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className={overlay} />
        <RDialog.Content className="cg-animate-drawer fixed inset-y-0 right-0 z-50 flex w-[min(32rem,100%)] flex-col border-l border-line bg-panel shadow-cg-pop focus:outline-none">
          <div className="flex items-start justify-between border-b border-line px-5 py-4">
            <div>
              <RDialog.Title className="font-display text-base font-semibold text-ink">{title}</RDialog.Title>
              {description ? <RDialog.Description className="mt-0.5 text-sm text-muted">{description}</RDialog.Description> : null}
            </div>
            <RDialog.Close className="rounded-cg-sm p-1 text-muted hover:bg-surface hover:text-ink" aria-label="Close">✕</RDialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div> : null}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
