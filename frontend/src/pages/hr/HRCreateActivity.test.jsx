import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HRCreateActivity from './HRCreateActivity';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'HR', name: 'HR User' },
  }),
}));

describe('HRCreateActivity', () => {
  it('renders HR create activity page', () => {
    const { container } = render(
      <BrowserRouter>
        <HRCreateActivity />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <HRCreateActivity />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
