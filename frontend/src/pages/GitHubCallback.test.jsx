import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GitHubCallback from './GitHubCallback';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(window.location.search)],
  };
});

describe('GitHubCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('renders loading state', () => {
    render(
      <BrowserRouter>
        <GitHubCallback />
      </BrowserRouter>
    );

    expect(screen.getByText('Connexion GitHub en cours…')).toBeInTheDocument();
  });

  it('navigates to login on missing token', async () => {
    window.history.pushState({}, '', '/?user=eyJ0ZXN0IjoidXNlciJ9');
    
    render(
      <BrowserRouter>
        <GitHubCallback />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login?error=github_failed', { replace: true });
    });
  });

  it('navigates to login on missing user', async () => {
    window.history.pushState({}, '', '/?token=test-token');
    
    render(
      <BrowserRouter>
        <GitHubCallback />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login?error=github_failed', { replace: true });
    });
  });

  it('stores token and user on success', async () => {
    const user = { id: 1, name: 'Test User' };
    const encodedUser = btoa(JSON.stringify(user));
    
    render(
      <BrowserRouter>
        <GitHubCallback />
      </BrowserRouter>
    );

    expect(screen.getByText('Connexion GitHub en cours…')).toBeInTheDocument();
  });

  it('navigates to login on invalid user encoding', async () => {
    window.history.pushState({}, '', '/?token=test-token&user=invalid-base64');
    
    render(
      <BrowserRouter>
        <GitHubCallback />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login?error=github_failed', { replace: true });
    });
  });
});
