import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RoleRoute from './RoleRoute';
import * as AuthContext from '../auth/AuthContext';

vi.mock('../auth/AuthContext');

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('RoleRoute', () => {
  it('redirects to login when user is not authenticated', () => {
    AuthContext.useAuth.mockReturnValue({ user: null });

    renderWithRouter(
      <RoleRoute allowed={['ADMIN']}>
        <div>Protected Content</div>
      </RoleRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to login when user role is not allowed', () => {
    AuthContext.useAuth.mockReturnValue({ user: { role: 'EMPLOYEE' } });

    renderWithRouter(
      <RoleRoute allowed={['ADMIN', 'HR']}>
        <div>Protected Content</div>
      </RoleRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user role is allowed', () => {
    AuthContext.useAuth.mockReturnValue({ user: { role: 'ADMIN' } });

    renderWithRouter(
      <RoleRoute allowed={['ADMIN', 'HR']}>
        <div>Protected Content</div>
      </RoleRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('allows multiple roles', () => {
    AuthContext.useAuth.mockReturnValue({ user: { role: 'HR' } });

    renderWithRouter(
      <RoleRoute allowed={['ADMIN', 'HR', 'MANAGER']}>
        <div>Protected Content</div>
      </RoleRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
