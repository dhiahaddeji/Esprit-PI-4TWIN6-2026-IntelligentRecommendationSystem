import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminLogs from './AdminLogs';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'ADMIN', name: 'Admin User' },
  }),
}));

describe('AdminLogs', () => {
  it('renders admin logs page', () => {
    const { container } = render(
      <BrowserRouter>
        <AdminLogs />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <AdminLogs />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
