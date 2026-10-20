export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 200;

export interface ListParamsInput {
  query?: string;
  sort?: string;
  order?: string;
  page?: string | number;
  limit?: string | number;
}

export interface ParsedList {
  where: Record<string, unknown> | undefined;
  orderBy: Record<string, 'asc' | 'desc'>;
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export interface ListResult<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ListOptions {
  searchFields: string[];
  sortable: string[];
  defaultSort: string;
  defaultLimit?: number;
}

function toInt(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function parseListQuery(input: ListParamsInput, opts: ListOptions): ParsedList {
  const page = toInt(input.page, 1);
  const limit = Math.min(toInt(input.limit, opts.defaultLimit ?? DEFAULT_LIMIT), MAX_LIMIT);
  const sortField = input.sort && opts.sortable.includes(input.sort) ? input.sort : opts.defaultSort;
  const order: 'asc' | 'desc' = input.order === 'asc' ? 'asc' : 'desc';

  const q = input.query?.trim();
  const where =
    q && opts.searchFields.length > 0
      ? { OR: opts.searchFields.map((f) => ({ [f]: { contains: q, mode: 'insensitive' } })) }
      : undefined;

  return { where, orderBy: { [sortField]: order }, skip: (page - 1) * limit, take: limit, page, limit };
}
