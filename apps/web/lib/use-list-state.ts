'use client';
import { useState } from 'react';
import type { ListParams } from './resource';

export function useListState(initial?: Partial<ListParams>) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(initial?.sort ?? 'updatedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>(initial?.order ?? 'desc');
  const onSort = (field: string) => {
    if (sort === field) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSort(field); setOrder('asc'); }
    setPage(1);
  };
  const params: ListParams = { query: query || undefined, sort, order, page, limit: 10 };
  return {
    params,
    search: { value: query, onChange: (v: string) => { setQuery(v); setPage(1); } },
    sort: { field: sort, order },
    onSort,
    page, setPage,
  };
}
