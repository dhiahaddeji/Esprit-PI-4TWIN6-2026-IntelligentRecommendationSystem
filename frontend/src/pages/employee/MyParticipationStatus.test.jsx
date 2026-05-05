import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyParticipationStatus from './MyParticipationStatus';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'EMPLOYEE', name: 'Test User' },
  }),
}));

describe('MyParticipationStatus', () => {
  it('renders my participation status page', () => {
    const { container } = render(
      <BrowserRouter>
        <MyParticipationStatus />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <MyParticipationStatus />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
