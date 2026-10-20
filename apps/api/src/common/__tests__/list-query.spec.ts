import { describe, it, expect } from 'vitest';
import { parseListQuery, DEFAULT_LIMIT, MAX_LIMIT } from '../list-query';

const opts = { searchFields: ['name'], sortable: ['name', 'createdAt'], defaultSort: 'createdAt' };

describe('parseListQuery', () => {
  it('defaults to page 1 and the default limit, sorted desc by default sort', () => {
    const r = parseListQuery({}, opts);
    expect(r.page).toBe(1);
    expect(r.limit).toBe(DEFAULT_LIMIT);
    expect(r.skip).toBe(0);
    expect(r.orderBy).toEqual({ createdAt: 'desc' });
    expect(r.where).toBeUndefined();
  });

  it('computes skip from page and limit', () => {
    const r = parseListQuery({ page: 3, limit: 5 }, opts);
    expect(r.skip).toBe(10);
    expect(r.take).toBe(5);
  });

  it('builds a case-insensitive OR search over the search fields', () => {
    const r = parseListQuery({ query: 'acme' }, opts);
    expect(r.where).toEqual({ OR: [{ name: { contains: 'acme', mode: 'insensitive' } }] });
  });

  it('ignores an unknown sort field and clamps the limit', () => {
    const r = parseListQuery({ sort: 'evil; DROP', order: 'asc', limit: 9999 }, opts);
    expect(r.orderBy).toEqual({ createdAt: 'asc' });
    expect(r.limit).toBe(MAX_LIMIT);
  });
});
