import { describe, it, expect, vi } from 'vitest';
import { safeCall, mocks } from './mock';

describe('mock', () => {
  describe('safeCall', () => {
    it('calls api function when not in mock mode', async () => {
      const mockApiFn = vi.fn().mockResolvedValue({ data: 'real data' });
      const result = await safeCall(mockApiFn, 'fallback');
      
      expect(result).toEqual({ data: 'real data' });
      expect(mockApiFn).toHaveBeenCalled();
    });

    it('returns api result when not in mock mode', async () => {
      const mockApiFn = vi.fn().mockResolvedValue({ data: { test: 'data' } });
      const fallback = { test: 'data' };

      const result = await safeCall(mockApiFn, fallback);

      expect(result).toEqual({ data: { test: 'data' } });
    });
  });

  describe('mocks', () => {
    it('provides mock activities', () => {
      expect(mocks.activities).toBeDefined();
      expect(Array.isArray(mocks.activities)).toBe(true);
    });

    it('provides mock recommendations', () => {
      expect(mocks.recommendations).toBeDefined();
      expect(Array.isArray(mocks.recommendations)).toBe(true);
    });

    it('provides mock invitations', () => {
      expect(mocks.invitations).toBeDefined();
      expect(Array.isArray(mocks.invitations)).toBe(true);
    });

    it('provides mock participations', () => {
      expect(mocks.participations).toBeDefined();
      expect(Array.isArray(mocks.participations)).toBe(true);
    });
  });
});
