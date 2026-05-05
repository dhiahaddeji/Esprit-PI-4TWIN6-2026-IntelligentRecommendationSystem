import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MainLayout from './MainLayout';

vi.mock('../components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('../components/Topbar', () => ({
  default: () => <div data-testid="topbar">Topbar</div>,
}));

vi.mock('../components/AccessibilityWidget', () => ({
  default: () => <div data-testid="accessibility-widget">Widget</div>,
}));

describe('MainLayout', () => {
  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('renders layout structure', () => {
    renderWithRouter(<MainLayout />);

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
  });

  it('renders skip link for accessibility', () => {
    renderWithRouter(<MainLayout />);

    const skipLink = screen.getByText('Aller au contenu principal');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink.getAttribute('href')).toBe('#mainContent');
  });

  it('renders main content area', () => {
    renderWithRouter(<MainLayout />);

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main.id).toBe('mainContent');
  });

  it('has correct tabIndex on main element', () => {
    renderWithRouter(<MainLayout />);

    const main = screen.getByRole('main');
    expect(main.getAttribute('tabIndex')).toBe('-1');
  });
});
