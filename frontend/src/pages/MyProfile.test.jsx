import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyProfile from './MyProfile';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'EMPLOYEE', name: 'Test User', email: 'test@example.com' },
  }),
}));

describe('MyProfile', () => {
  it('renders my profile page', () => {
    const { container } = render(
      <BrowserRouter>
        <MyProfile />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <MyProfile />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
