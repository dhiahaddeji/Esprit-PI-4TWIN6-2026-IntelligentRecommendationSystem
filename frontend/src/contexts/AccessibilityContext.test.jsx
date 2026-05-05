import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AccessibilityProvider, useAccessibility } from './AccessibilityContext';

function TestComponent() {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    dyslexicFont,
    setDyslexicFont,
    highContrast,
    setHighContrast,
    reduceMotion,
    setReduceMotion,
  } = useAccessibility();

  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="fontSize">{fontSize}</div>
      <div data-testid="dyslexicFont">{String(dyslexicFont)}</div>
      <div data-testid="highContrast">{String(highContrast)}</div>
      <div data-testid="reduceMotion">{String(reduceMotion)}</div>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setFontSize(20)}>Set Font 20</button>
      <button onClick={() => setDyslexicFont(true)}>Enable Dyslexic</button>
      <button onClick={() => setHighContrast(true)}>Enable Contrast</button>
      <button onClick={() => setReduceMotion(true)}>Enable Reduce Motion</button>
    </div>
  );
}

describe('AccessibilityContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.fontSize = '';
    document.body.className = '';
  });

  it('provides default values', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('fontSize')).toHaveTextContent('16');
    expect(screen.getByTestId('dyslexicFont')).toHaveTextContent('false');
    expect(screen.getByTestId('highContrast')).toHaveTextContent('false');
    expect(screen.getByTestId('reduceMotion')).toHaveTextContent('false');
  });

  it('updates theme', () => {
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

  it('updates font size', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    act(() => {
      screen.getByText('Set Font 20').click();
    });

    expect(screen.getByTestId('fontSize')).toHaveTextContent('20');
    expect(localStorage.getItem('fontSize')).toBe('20');
  });

  it('enables dyslexic font', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    act(() => {
      screen.getByText('Enable Dyslexic').click();
    });

    expect(screen.getByTestId('dyslexicFont')).toHaveTextContent('true');
    expect(localStorage.getItem('dyslexicFont')).toBe('true');
    expect(document.body.classList.contains('font-dyslexic')).toBe(true);
  });

  it('enables high contrast', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    act(() => {
      screen.getByText('Enable Contrast').click();
    });

    expect(screen.getByTestId('highContrast')).toHaveTextContent('true');
    expect(localStorage.getItem('highContrast')).toBe('true');
    expect(document.body.classList.contains('high-contrast')).toBe(true);
  });

  it('enables reduce motion', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    act(() => {
      screen.getByText('Enable Reduce Motion').click();
    });

    expect(screen.getByTestId('reduceMotion')).toHaveTextContent('true');
    expect(localStorage.getItem('reduceMotion')).toBe('true');
    expect(document.body.classList.contains('reduce-motion')).toBe(true);
  });

  it('throws error when used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAccessibility must be used inside AccessibilityProvider');

    consoleError.mockRestore();
  });
});
