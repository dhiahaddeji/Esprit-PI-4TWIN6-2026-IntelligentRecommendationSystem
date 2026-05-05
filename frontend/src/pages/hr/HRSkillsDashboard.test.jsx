import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HRSkillsDashboard from './HRSkillsDashboard';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'HR', name: 'HR User' },
  }),
}));

describe('HRSkillsDashboard', () => {
  it('renders HR skills dashboard page', () => {
    const { container } = render(
      <BrowserRouter>
        <HRSkillsDashboard />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <HRSkillsDashboard />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
