import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyActivities from './MyActivities';

describe('MyActivities', () => {
  it('renders my activities heading', () => {
    render(<MyActivities />);
    expect(screen.getByText('My Activities')).toBeInTheDocument();
  });

  it('renders heading as h1', () => {
    render(<MyActivities />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('My Activities');
  });
});
