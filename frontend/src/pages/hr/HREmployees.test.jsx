import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HREmployees from './HREmployees';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'HR', name: 'HR User' },
  }),
}));

describe('HREmployees', () => {
  it('renders HR employees page', () => {
    const { container } = render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <HREmployees />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
