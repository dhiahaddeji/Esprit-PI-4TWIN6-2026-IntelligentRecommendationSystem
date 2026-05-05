import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EmployeeSkills from './EmployeeSkills';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'EMPLOYEE', name: 'Test User' },
  }),
}));

describe('EmployeeSkills', () => {
  it('renders employee skills page', () => {
    const { container } = render(
      <BrowserRouter>
        <EmployeeSkills />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <EmployeeSkills />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
