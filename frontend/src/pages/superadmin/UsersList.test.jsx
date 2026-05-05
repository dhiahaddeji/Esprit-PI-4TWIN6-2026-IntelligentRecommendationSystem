import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UsersList from './UsersList';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'ADMIN', name: 'Admin User' },
  }),
}));

describe('UsersList', () => {
  it('renders users list page', () => {
    const { container } = render(
      <BrowserRouter>
        <UsersList />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <UsersList />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
