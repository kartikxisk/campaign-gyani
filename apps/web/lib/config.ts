'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from './api-client';

export interface AppConfig {
  brandName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  timezone: string;
  emailFooter: string;
}

export function useConfig() {
  const q = useQuery<AppConfig>({
    queryKey: ['config'],
    queryFn: () => api.get<AppConfig>('/config'),
    staleTime: 5 * 60 * 1000,
  });
  return q.data ?? { brandName: 'Campaign-Gyani', logoUrl: null, faviconUrl: null, primaryColor: '#0891b2', timezone: 'UTC', emailFooter: '' };
}
