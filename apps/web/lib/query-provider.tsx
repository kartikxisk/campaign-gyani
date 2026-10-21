'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { ToastProvider } from '@cg/ui';
import { useConfig } from './config';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }));
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <BrandApplier />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}

function BrandApplier() {
  const config = useConfig();
  useEffect(() => {
    if (config.primaryColor) document.documentElement.style.setProperty('--cg-primary', config.primaryColor);
    if (config.brandName) document.title = config.brandName;
  }, [config.primaryColor, config.brandName]);
  return null;
}
