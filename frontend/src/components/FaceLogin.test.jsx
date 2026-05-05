import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FaceLogin from './FaceLogin';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
  }),
}));

describe('FaceLogin', () => {
  it('renders face login component', () => {
    const { container } = render(
      <BrowserRouter>
        <FaceLogin />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <FaceLogin />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
