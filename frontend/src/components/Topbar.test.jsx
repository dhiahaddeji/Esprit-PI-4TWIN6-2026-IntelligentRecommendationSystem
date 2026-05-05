import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Topbar from './Topbar';
import * as AuthContext from '../auth/AuthContext';

vi.mock('../auth/AuthContext');
vi.mock('../contexts/NotificationsContext', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markRead: vi.fn(),
  }),
}));

describe('Topbar', () => {
  it('renders topbar', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { name: 'Test User', role: 'EMPLOYEE' },
      logout: vi.fn(),
    });

    const { container } = render(
      <BrowserRouter>
        <Topbar />
      </BrowserRouter>
    );

    expect(container.querySelector('.topbar')).toBeInTheDocument();
  });

  it('renders with user information', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { name: 'John Doe', role: 'ADMIN' },
      logout: vi.fn(),
    });

    const { container } = render(
      <BrowserRouter>
        <Topbar />
      </BrowserRouter>
    );

    expect(container).toBeInTheDocument();
  });
});
