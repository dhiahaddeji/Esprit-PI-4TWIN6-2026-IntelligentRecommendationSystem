import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HREmployeeDetail from './HREmployeeDetail';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'HR', name: 'HR User' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '123' }),
  };
});

describe('HREmployeeDetail', () => {
  it('renders HR employee detail page', () => {
    const { container } = render(
      <BrowserRouter>
        <HREmployeeDetail />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <HREmployeeDetail />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
