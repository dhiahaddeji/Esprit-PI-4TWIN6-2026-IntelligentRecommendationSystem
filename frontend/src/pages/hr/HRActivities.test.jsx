import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HRActivities from './HRActivities';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'HR', name: 'HR User' },
  }),
}));

describe('HRActivities', () => {
  it('renders HR activities page', () => {
    const { container } = render(
      <BrowserRouter>
        <HRActivities />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <HRActivities />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
