import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CreateUser from './CreateUser';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'ADMIN', name: 'Admin User' },
  }),
}));

describe('CreateUser', () => {
  it('renders create user page', () => {
    const { container } = render(
      <BrowserRouter>
        <CreateUser />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <CreateUser />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
