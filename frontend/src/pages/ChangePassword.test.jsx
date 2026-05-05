import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ChangePassword from './ChangePassword';
import * as AuthContext from '../auth/AuthContext';

const mockNavigate = vi.fn();
const mockChangePassword = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../auth/AuthContext');

describe('ChangePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthContext.useAuth.mockReturnValue({
      user: { name: 'Test User' },
      changePassword: mockChangePassword,
    });
  });

  it('renders change password form', () => {
    render(
      <BrowserRouter>
        <ChangePassword />
      </BrowserRouter>
    );

    expect(screen.getByText('Changer votre mot de passe')).toBeInTheDocument();
    expect(screen.getByText(/Bonjour/)).toBeInTheDocument();
  });

  it('shows error when password is too short', async () => {
    render(
      <BrowserRouter>
        <ChangePassword />
      </BrowserRouter>
    );

    const newPasswordInput = screen.getByPlaceholderText(/Min. 8 caractères/);
    const confirmInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button');

    fireEvent.change(newPasswordInput, { target: { value: 'Short1' } });
    fireEvent.change(confirmInput, { target: { value: 'Short1' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Le mot de passe doit contenir au moins 8 caractères.')).toBeInTheDocument();
    });
  });

  it('shows error when password has no uppercase', async () => {
    render(
      <BrowserRouter>
        <ChangePassword />
      </BrowserRouter>
    );

    const newPasswordInput = screen.getByPlaceholderText(/Min. 8 caractères/);
    const confirmInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button');

    fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Il doit contenir au moins une majuscule.')).toBeInTheDocument();
    });
  });

  it('shows error when password has no digit', async () => {
    render(
      <BrowserRouter>
        <ChangePassword />
      </BrowserRouter>
    );

    const newPasswordInput = screen.getByPlaceholderText(/Min. 8 caractères/);
    const confirmInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button');

    fireEvent.change(newPasswordInput, { target: { value: 'Password' } });
    fireEvent.change(confirmInput, { target: { value: 'Password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Il doit contenir au moins un chiffre.')).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    render(
      <BrowserRouter>
        <ChangePassword />
      </BrowserRouter>
    );

    const newPasswordInput = screen.getByPlaceholderText(/Min. 8 caractères/);
    const confirmInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button');

    fireEvent.change(newPasswordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmInput, { target: { value: 'Password456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Les mots de passe ne correspondent pas.')).toBeInTheDocument();
    });
  });

  it('submits form successfully', async () => {
    mockChangePassword.mockResolvedValue({});

    render(
      <BrowserRouter>
        <ChangePassword />
      </BrowserRouter>
    );

    const newPasswordInput = screen.getByPlaceholderText(/Min. 8 caractères/);
    const confirmInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button');

    fireEvent.change(newPasswordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('Password123');
      expect(mockNavigate).toHaveBeenCalledWith('/complete-profile', { replace: true });
    });
  });

  it('shows password strength indicator', () => {
    render(
      <BrowserRouter>
        <ChangePassword />
      </BrowserRouter>
    );

    const newPasswordInput = screen.getByPlaceholderText(/Min. 8 caractères/);
    fireEvent.change(newPasswordInput, { target: { value: 'Password123!' } });

    expect(screen.getByText(/8 caractères minimum/)).toBeInTheDocument();
    expect(screen.getByText(/Une majuscule/)).toBeInTheDocument();
    expect(screen.getByText(/Un chiffre/)).toBeInTheDocument();
  });

  it('handles API error', async () => {
    mockChangePassword.mockRejectedValue(new Error('API Error'));

    render(
      <BrowserRouter>
        <ChangePassword />
      </BrowserRouter>
    );

    const newPasswordInput = screen.getByPlaceholderText(/Min. 8 caractères/);
    const confirmInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button');

    fireEvent.change(newPasswordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });
});
