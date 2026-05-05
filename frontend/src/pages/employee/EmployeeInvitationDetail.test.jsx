import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EmployeeInvitationDetail from './EmployeeInvitationDetail';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'EMPLOYEE', name: 'Test User' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '123' }),
  };
});

describe('EmployeeInvitationDetail', () => {
  it('renders employee invitation detail page', () => {
    const { container } = render(
      <BrowserRouter>
        <EmployeeInvitationDetail />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <EmployeeInvitationDetail />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
