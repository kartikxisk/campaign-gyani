'use client';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from './api-client';

export interface ListResult<T> { rows: T[]; total: number; page: number; limit: number; }
export interface ListParams { query?: string; sort?: string; order?: 'asc' | 'desc'; page?: number; limit?: number; filters?: Record<string, string | undefined>; }

function qs(params: ListParams): string {
  const sp = new URLSearchParams();
  if (params.query) sp.set('query', params.query);
  if (params.sort) sp.set('sort', params.sort);
  if (params.order) sp.set('order', params.order);
  if (params.page) sp.set('page', String(params.page));
  if (params.limit) sp.set('limit', String(params.limit));
  for (const [k, v] of Object.entries(params.filters ?? {})) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function useList<T>(resource: string, params: ListParams) {
  return useQuery<ListResult<T>>({
    queryKey: [resource, 'list', params],
    queryFn: () => api.get<ListResult<T>>(`/${resource}${qs(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useItem<T>(resource: string, id: string | null) {
  return useQuery<T>({
    queryKey: [resource, 'item', id],
    queryFn: () => api.get<T>(`/${resource}/${id}`),
    enabled: Boolean(id),
  });
}

export function useSaveItem<T>(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: unknown }) =>
      id ? api.put<T>(`/${resource}/${id}`, body) : api.post<T>(`/${resource}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
  });
}

export function useDeleteItem(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/${resource}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
  });
}

/** Loads all rows of a resource for use as select options (small lists). */
export function useAllOptions<T extends { id: string }>(resource: string, label: (row: T) => string) {
  const { data } = useList<T>(resource, { limit: 200 });
  return (data?.rows ?? []).map((r) => ({ value: r.id, label: label(r) }));
}
