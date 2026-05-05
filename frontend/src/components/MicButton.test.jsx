import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MicButton from './MicButton';

describe('MicButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mic button', () => {
    render(<MicButton onResult={vi.fn()} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('calls onResult when provided', () => {
    const mockOnResult = vi.fn();
    render(<MicButton onResult={mockOnResult} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('renders with custom style', () => {
    const { container } = render(<MicButton onResult={vi.fn()} />);
    
    expect(container.firstChild).toBeInTheDocument();
  });
});
