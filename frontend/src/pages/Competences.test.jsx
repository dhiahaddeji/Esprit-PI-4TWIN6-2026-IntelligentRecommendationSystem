import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Competences from './Competences';

describe('Competences', () => {
  it('renders competences heading', () => {
    render(<Competences />);
    expect(screen.getByText('Compétences')).toBeInTheDocument();
  });

  it('renders heading as h1', () => {
    render(<Competences />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Compétences');
  });
});
