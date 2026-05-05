import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ManagerReviewActivity from './ManagerReviewActivity';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'MANAGER', name: 'Manager User' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '123' }),
  };
});

describe('ManagerReviewActivity', () => {
  it('renders manager review activity page', () => {
    const { container } = render(
      <BrowserRouter>
        <ManagerReviewActivity />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <ManagerReviewActivity />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
