import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Teams from './Teams';

describe('Teams', () => {
  it('renders teams text', () => {
    render(<Teams />);
    expect(screen.getByText('Teams')).toBeInTheDocument();
  });

  it('renders within a div', () => {
    const { container } = render(<Teams />);
    expect(container.firstChild.tagName).toBe('DIV');
  });
});
