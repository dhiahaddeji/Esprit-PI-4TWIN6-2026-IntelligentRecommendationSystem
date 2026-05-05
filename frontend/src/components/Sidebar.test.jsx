import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import * as AuthContext from '../auth/AuthContext';

vi.mock('../auth/AuthContext');

describe('Sidebar', () => {
  it('renders sidebar', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { role: 'EMPLOYEE', name: 'Test User' },
      logout: vi.fn(),
    });

    const { container } = render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(container.querySelector('.sidebar')).toBeInTheDocument();
  });

  it('renders for different user roles', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { role: 'ADMIN', name: 'Admin User' },
      logout: vi.fn(),
    });

    const { container } = render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(container.querySelector('.sidebar')).toBeInTheDocument();
  });
});
