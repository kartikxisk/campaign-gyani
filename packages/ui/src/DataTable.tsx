import type { ReactNode } from 'react';
import { cn } from './cn';
import { Input } from './Input';
import { Skeleton } from './Feedback';
import { EmptyState } from './Feedback';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  mono?: boolean;
  align?: 'left' | 'right';
  render?: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  sort?: { field: string; order: 'asc' | 'desc' };
  onSort?: (field: string) => void;
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  pagination?: { page: number; limit: number; total: number; onPage: (p: number) => void };
  rowActions?: (row: T) => ReactNode;
  toolbar?: ReactNode;
  empty?: { title: string; body?: string; action?: ReactNode };
}

export function DataTable<T>({ columns, rows, rowKey, loading, sort, onSort, search, pagination, rowActions, toolbar, empty }: DataTableProps<T>) {
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;
  return (
    <div className="space-y-3">
      {(search || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {search ? (
            <Input value={search.value} onChange={(e) => search.onChange(e.target.value)} placeholder={search.placeholder ?? 'Search…'} className="max-w-xs" aria-label="Search" />
          ) : <span />}
          {toolbar ? <div className="flex items-center gap-2">{toolbar}</div> : null}
        </div>
      )}
      <div className="overflow-hidden rounded-cg border border-line bg-panel shadow-cg">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-surface/60 text-left">
              {columns.map((c) => (
                <th key={c.key} className={cn('px-4 py-2.5 font-medium text-ink-soft', c.align === 'right' && 'text-right')}>
                  {c.sortable && onSort ? (
                    <button type="button" onClick={() => onSort(c.key)} className="inline-flex items-center gap-1 hover:text-ink">
                      {c.header}
                      <span aria-hidden className="text-xs">{sort?.field === c.key ? (sort.order === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </button>
                  ) : c.header}
                </th>
              ))}
              {rowActions ? <th className="px-4 py-2.5 text-right font-medium text-ink-soft">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {columns.map((c) => <td key={c.key} className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>)}
                  {rowActions ? <td className="px-4 py-3" /> : null}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-4 py-3">
                <EmptyState title={empty?.title ?? 'Nothing here yet'} body={empty?.body} action={empty?.action} />
              </td></tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-line last:border-0 hover:bg-surface/50">
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-3 text-ink', c.align === 'right' && 'text-right', c.mono && 'font-mono text-[13px] text-ink-soft')}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                    </td>
                  ))}
                  {rowActions ? <td className="px-4 py-3 text-right">{rowActions(row)}</td> : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
      {pagination && pagination.total > pagination.limit && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{pagination.total} total</span>
          <div className="flex items-center gap-2">
            <button className="rounded-cg-sm border border-line-strong px-2 py-1 disabled:opacity-40" disabled={pagination.page <= 1} onClick={() => pagination.onPage(pagination.page - 1)}>Prev</button>
            <span>Page {pagination.page} / {totalPages}</span>
            <button className="rounded-cg-sm border border-line-strong px-2 py-1 disabled:opacity-40" disabled={pagination.page >= totalPages} onClick={() => pagination.onPage(pagination.page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
