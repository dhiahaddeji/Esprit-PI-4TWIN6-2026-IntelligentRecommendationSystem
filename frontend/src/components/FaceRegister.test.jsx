import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import FaceRegister from './FaceRegister';

describe('FaceRegister', () => {
  it('renders face register component', () => {
    const { container } = render(<FaceRegister />);
    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() => render(<FaceRegister />)).not.toThrow();
  });
});
