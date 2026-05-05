import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ManagerSkillApproval from './ManagerSkillApproval';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'MANAGER', name: 'Manager User' },
  }),
}));

describe('ManagerSkillApproval', () => {
  it('renders manager skill approval page', () => {
    const { container } = render(
      <BrowserRouter>
        <ManagerSkillApproval />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <ManagerSkillApproval />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
