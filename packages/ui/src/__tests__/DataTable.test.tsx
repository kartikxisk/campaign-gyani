import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTable, type Column } from '../DataTable';

interface Row { id: string; name: string; }
const columns: Column<Row>[] = [{ key: 'name', header: 'Name', sortable: true }];

describe('DataTable', () => {
  it('renders a row per item', () => {
    render(<DataTable columns={columns} rows={[{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }]} rowKey={(r) => r.id} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });
  it('fires onSort when a sortable header is clicked', () => {
    const onSort = vi.fn();
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} onSort={onSort} empty={{ title: 'Empty' }} />);
    fireEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(onSort).toHaveBeenCalledWith('name');
  });
  it('shows the empty state when there are no rows', () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} empty={{ title: 'No campaigns yet', body: 'Create one' }} />);
    expect(screen.getByText('No campaigns yet')).toBeInTheDocument();
  });
});
