import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RoleSwitcher from './RoleSwitcher';
import * as AuthContext from '../auth/AuthContext';

vi.mock('../auth/AuthContext');

describe('RoleSwitcher', () => {
  it('renders role selector', () => {
    const mockSetDevRole = vi.fn();
    AuthContext.useAuth.mockReturnValue({
      user: { role: 'EMPLOYEE' },
      setDevRole: mockSetDevRole,
    });

    render(<RoleSwitcher />);

    expect(screen.getByText('Role:')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays current user role', () => {
    const mockSetDevRole = vi.fn();
    AuthContext.useAuth.mockReturnValue({
      user: { role: 'ADMIN' },
      setDevRole: mockSetDevRole,
    });

    render(<RoleSwitcher />);

    const select = screen.getByRole('combobox');
    expect(select.value).toBe('ADMIN');
  });

  it('defaults to EMPLOYEE when no user role', () => {
    const mockSetDevRole = vi.fn();
    AuthContext.useAuth.mockReturnValue({
      user: null,
      setDevRole: mockSetDevRole,
    });

    render(<RoleSwitcher />);

    const select = screen.getByRole('combobox');
    expect(select.value).toBe('EMPLOYEE');
  });

  it('calls setDevRole when role is changed', () => {
    const mockSetDevRole = vi.fn();
    AuthContext.useAuth.mockReturnValue({
      user: { role: 'EMPLOYEE' },
      setDevRole: mockSetDevRole,
    });

    render(<RoleSwitcher />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'ADMIN' } });

    expect(mockSetDevRole).toHaveBeenCalledWith('ADMIN');
  });

  it('renders all role options', () => {
    const mockSetDevRole = vi.fn();
    AuthContext.useAuth.mockReturnValue({
      user: { role: 'EMPLOYEE' },
      setDevRole: mockSetDevRole,
    });

    render(<RoleSwitcher />);

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(5);
    expect(options.map(o => o.value)).toEqual(['ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE']);
  });
});
