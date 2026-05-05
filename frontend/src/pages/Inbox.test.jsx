import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Inbox from './Inbox';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'EMPLOYEE', name: 'Test User' },
  }),
}));

describe('Inbox', () => {
  it('renders inbox page', () => {
    const { container } = render(
      <BrowserRouter>
        <Inbox />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <Inbox />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
