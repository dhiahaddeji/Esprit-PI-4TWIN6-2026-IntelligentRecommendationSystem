import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import AccessibilityWidget from './AccessibilityWidget';

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

describe('AccessibilityWidget', () => {
  it('renders accessibility widget', () => {
    const { container } = render(<AccessibilityWidget />);
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() => render(<AccessibilityWidget />)).not.toThrow();
  });
});
