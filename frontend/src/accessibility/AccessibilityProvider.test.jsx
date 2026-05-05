import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AccessibilityProvider, useAccessibility } from './AccessibilityProvider';

function TestComponent() {
  const { theme, setTheme, fontSize, setFontSize } = useAccessibility();

  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="fontSize">{fontSize}</div>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setFontSize(18)}>Set Font 18</button>
    </div>
  );
}

describe('AccessibilityProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('--app-font-size');
  });

  it('provides default values', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('fontSize')).toHaveTextContent('14');
  });

  it('updates theme and persists to localStorage', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    act(() => {
      screen.getByText('Set Dark').click();
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('updates font size and persists to localStorage', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    act(() => {
      screen.getByText('Set Font 18').click();
    });

    expect(screen.getByTestId('fontSize')).toHaveTextContent('18');
    expect(localStorage.getItem('fontSize')).toBe('18');
  });

  it('loads values from localStorage on mount', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('fontSize', '20');

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('fontSize')).toHaveTextContent('20');
  });

  it('throws error when used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAccessibility must be used inside AccessibilityProvider');

    consoleError.mockRestore();
  });
});
