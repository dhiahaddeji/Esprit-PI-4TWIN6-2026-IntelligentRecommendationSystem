import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import KeyboardNavController from './KeyboardNavController';
import * as useKeyboardNavigation from '../hooks/useKeyboardNavigation';

vi.mock('../hooks/useKeyboardNavigation');

describe('KeyboardNavController', () => {
  it('renders without crashing', () => {
    useKeyboardNavigation.default = vi.fn();
    
    const { container } = render(<KeyboardNavController />);
    
    expect(container.firstChild).toBeNull();
  });

  it('calls useKeyboardNavigation hook', () => {
    const mockHook = vi.fn();
    useKeyboardNavigation.default = mockHook;
    
    render(<KeyboardNavController />);
    
    expect(mockHook).toHaveBeenCalled();
  });
});
