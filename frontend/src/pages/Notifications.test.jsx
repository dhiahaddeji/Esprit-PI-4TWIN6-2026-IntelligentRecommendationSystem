import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Notifications from './Notifications';

describe('Notifications', () => {
  it('renders notifications heading', () => {
    render(<Notifications />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('renders heading as h1', () => {
    render(<Notifications />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Notifications');
  });
});
