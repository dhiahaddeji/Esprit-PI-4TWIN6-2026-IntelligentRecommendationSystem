import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EditUser from './EditUser';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'ADMIN', name: 'Admin User' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '123' }),
  };
});

describe('EditUser', () => {
  it('renders edit user page', () => {
    const { container } = render(
      <BrowserRouter>
        <EditUser />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <EditUser />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
