import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Roles from './Roles';

describe('Roles', () => {
  it('renders roles text', () => {
    render(<Roles />);
    expect(screen.getByText('Roles')).toBeInTheDocument();
  });

  it('renders within a div', () => {
    const { container } = render(<Roles />);
    expect(container.firstChild.tagName).toBe('DIV');
  });
});
