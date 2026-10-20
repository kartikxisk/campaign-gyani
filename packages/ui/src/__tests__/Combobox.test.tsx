import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Combobox } from '../Combobox';

const options = [{ value: 'a', label: 'Finance team' }, { value: 'b', label: 'Engineering team' }];

describe('Combobox', () => {
  it('filters options as the user types and selects one', () => {
    const onChange = vi.fn();
    render(<Combobox options={options} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'eng' } });
    expect(screen.queryByText('Finance team')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Engineering team' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
