import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Users from './Users';

describe('Users', () => {
  it('renders users text', () => {
    render(<Users />);
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('renders within a div', () => {
    const { container } = render(<Users />);
    expect(container.firstChild.tagName).toBe('DIV');
  });
});
