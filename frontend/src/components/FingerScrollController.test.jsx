import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import FingerScrollController from './FingerScrollController';

describe('FingerScrollController', () => {
  it('renders without crashing', () => {
    const { container } = render(<FingerScrollController />);
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() => render(<FingerScrollController />)).not.toThrow();
  });
});
