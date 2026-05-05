import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResetPassword from './ResetPassword';
import * as authService from '../auth/authService';

vi.mock('../auth/authService');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams('?token=test-token')],
  };
});

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders reset password form', () => {
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    expect(screen.getByText('Reinitialiser le mot de passe')).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('••••••••')).toHaveLength(2);
  });

  it('shows error when passwords do not match', async () => {
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    const newPasswordInput = screen.getAllByPlaceholderText('••••••••')[0];
    const confirmPasswordInput = screen.getAllByPlaceholderText('••••••••')[1];
    const submitButton = screen.getByRole('button', { name: /mettre a jour/i });

    fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Les mots de passe ne correspondent pas.')).toBeInTheDocument();
    });
  });

  it('shows error when password is too short', async () => {
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    const newPasswordInput = screen.getAllByPlaceholderText('••••••••')[0];
    const confirmPasswordInput = screen.getAllByPlaceholderText('••••••••')[1];
    const submitButton = screen.getByRole('button', { name: /mettre a jour/i });

    fireEvent.change(newPasswordInput, { target: { value: 'short' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Le mot de passe doit contenir au moins 8 caractères.')).toBeInTheDocument();
    });
  });

  it('submits form successfully', async () => {
    authService.resetPassword.mockResolvedValue({ message: 'Success' });

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    const newPasswordInput = screen.getAllByPlaceholderText('••••••••')[0];
    const confirmPasswordInput = screen.getAllByPlaceholderText('••••••••')[1];
    const submitButton = screen.getByRole('button', { name: /mettre a jour/i });

    fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authService.resetPassword).toHaveBeenCalledWith('test-token', 'password123');
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    authService.resetPassword.mockRejectedValue(new Error('API Error'));

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    const newPasswordInput = screen.getAllByPlaceholderText('••••••••')[0];
    const confirmPasswordInput = screen.getAllByPlaceholderText('••••••••')[1];
    const submitButton = screen.getByRole('button', { name: /mettre a jour/i });

    fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('renders back to login link', () => {
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    const link = screen.getByText('Retour a la connexion');
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/login');
  });
});
