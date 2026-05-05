import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Activities from './Activities';

describe('Activities', () => {
  it('renders activities heading', () => {
    render(<Activities />);
    expect(screen.getByText('Activités')).toBeInTheDocument();
  });

  it('renders heading as h1', () => {
    render(<Activities />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Activités');
  });
});
