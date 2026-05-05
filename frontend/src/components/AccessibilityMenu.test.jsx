import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import AccessibilityMenu from './AccessibilityMenu';

vi.mock('../contexts/AccessibilityContext', () => ({
  useAccessibility: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    fontSize: 16,
    setFontSize: vi.fn(),
    dyslexicFont: false,
    setDyslexicFont: vi.fn(),
    highContrast: false,
    setHighContrast: vi.fn(),
    reduceMotion: false,
    setReduceMotion: vi.fn(),
  }),
}));

describe('AccessibilityMenu', () => {
  it('renders accessibility menu', () => {
    const { container } = render(<AccessibilityMenu />);
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() => render(<AccessibilityMenu />)).not.toThrow();
  });
});
