import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('calls onConfirm only after the confirm button is pressed', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open title="Delete campaign?" confirmLabel="Delete" destructive onConfirm={onConfirm} onOpenChange={vi.fn()} />);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
