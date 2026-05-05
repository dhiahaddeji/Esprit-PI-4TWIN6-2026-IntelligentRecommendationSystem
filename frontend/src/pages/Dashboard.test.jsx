import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'EMPLOYEE', name: 'Test User' },
  }),
}));

describe('Dashboard', () => {
  it('renders dashboard page', () => {
    const { container } = render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
