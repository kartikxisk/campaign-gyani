import * as RToast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Tone = 'info' | 'success' | 'error';
interface ToastMsg { id: number; title: string; tone: Tone; }
interface Ctx { notify: (title: string, tone?: Tone) => void; }

const ToastCtx = createContext<Ctx | null>(null);

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastMsg[]>([]);
  const notify = useCallback((title: string, tone: Tone = 'info') => {
    setItems((prev) => [...prev, { id: Date.now() + Math.random(), title, tone }]);
  }, []);
  const toneClass = { info: 'border-line-strong', success: 'border-ok/40', error: 'border-danger/40' };
  return (
    <ToastCtx.Provider value={{ notify }}>
      <RToast.Provider swipeDirection="right">
        {children}
        {items.map((t) => (
          <RToast.Root key={t.id} duration={4000} onOpenChange={(o) => !o && setItems((p) => p.filter((x) => x.id !== t.id))}
            className={`cg-animate-toast rounded-cg border bg-panel px-4 py-3 text-sm text-ink shadow-cg-pop ${toneClass[t.tone]}`}>
            <RToast.Title>{t.title}</RToast.Title>
          </RToast.Root>
        ))}
        <RToast.Viewport className="fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </RToast.Provider>
    </ToastCtx.Provider>
  );
}
