import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EmployeeInvitations from './EmployeeInvitations';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'EMPLOYEE', name: 'Test User' },
  }),
}));

describe('EmployeeInvitations', () => {
  it('renders employee invitations page', () => {
    const { container } = render(
      <BrowserRouter>
        <EmployeeInvitations />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <EmployeeInvitations />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
