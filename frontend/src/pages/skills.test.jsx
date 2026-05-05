import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Skills from './skills';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'EMPLOYEE', name: 'Test User' },
  }),
}));

describe('Skills', () => {
  it('renders skills page', () => {
    const { container } = render(
      <BrowserRouter>
        <Skills />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() =>
      render(
        <BrowserRouter>
          <Skills />
        </BrowserRouter>
      )
    ).not.toThrow();
  });
});
