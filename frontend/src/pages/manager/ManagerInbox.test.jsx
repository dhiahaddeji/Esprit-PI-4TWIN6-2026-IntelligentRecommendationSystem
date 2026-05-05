import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ManagerInbox from './ManagerInbox';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'MANAGER', name: 'Manager User' },
  }),
}));

describe('ManagerInbox', () => {
  it('renders manager inbox page', () => {
    const { container } = render(
      <BrowserRouter>
        <ManagerInbox />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <ManagerInbox />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
