'use client';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from './api-client';

export interface AdminProfile { id: string; email: string; }

export function useMe() {
  return useQuery<AdminProfile | null>({
    queryKey: ['me'],
    // A failed /me means "not usable session" — resolve to null fast instead of
    // retry-looping (which left the layout stuck on "Loading console…").
    retry: false,
    staleTime: 30_000,
    queryFn: async () => {
      try {
        return await api.get<AdminProfile>('/auth/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
  });
}
