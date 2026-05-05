import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HRDepartments from './HRDepartments';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'HR', name: 'HR User' },
  }),
}));

describe('HRDepartments', () => {
  it('renders HR departments page', () => {
    const { container } = render(
      <BrowserRouter>
        <HRDepartments />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <HRDepartments />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
