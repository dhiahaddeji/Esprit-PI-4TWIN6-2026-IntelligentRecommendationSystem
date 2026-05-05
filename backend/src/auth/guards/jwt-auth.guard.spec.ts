import { JwtAuthGuard } from './jwt-auth.guard';
import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  describe('handleRequest', () => {
    it('returns user when no error and user exists', () => {
      const user = { userId: 'u1', role: 'EMPLOYEE' };
      expect(guard.handleRequest(null, user)).toBe(user);
    });

    it('throws UnauthorizedException when user is null', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
    });

    it('throws the original error when err is provided', () => {
      const err = new Error('JWT expired');
      expect(() => guard.handleRequest(err, null)).toThrow(err);
    });

    it('throws UnauthorizedException with correct message when no user', () => {
      try {
        guard.handleRequest(null, null);
      } catch (e: any) {
        expect(e.message).toBe('Authentication requise');
      }
    });
  });
});
