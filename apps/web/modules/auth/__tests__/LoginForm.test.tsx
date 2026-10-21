import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn();
vi.mock('@/lib/api-client', () => ({ api: { post: (...a: unknown[]) => post(...a), clearCsrf: vi.fn() }, ApiError: class {} }));

import { LoginForm } from '../LoginForm';

describe('LoginForm', () => {
  beforeEach(() => post.mockReset());

  it('blocks submitting with an invalid email', async () => {
    render(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Password'), 'secret12');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('signs in with email and password', async () => {
    post.mockResolvedValueOnce({ id: '1', email: 'a@b.com' });
    const onSuccess = vi.fn();
    render(<LoginForm onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret12');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'secret12' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('shows an error when the password is wrong', async () => {
    post.mockRejectedValueOnce(new Error('bad'));
    render(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret12');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
