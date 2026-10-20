'use client';
import { useQuery } from '@tanstack/react-query';
import type { AppMode } from '@cg/shared';
import { api } from './api-client';

export function useMode() {
  const q = useQuery<{ mode: AppMode | null }>({
    queryKey: ['settings', 'mode'],
    queryFn: () => api.get<{ mode: AppMode | null }>('/settings/mode'),
    staleTime: Infinity,
  });
  return { mode: q.data?.mode ?? null, isLoading: q.isLoading };
}

export function isEmailMode(mode: AppMode | null): boolean {
  return mode === 'email';
}
