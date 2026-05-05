import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

const makeContext = (userRole: string, requiredRoles?: string[]): ExecutionContext => {
  const reflector = { get: jest.fn().mockReturnValue(requiredRoles) } as any;
  return {
    getHandler: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user: { role: userRole } }),
    }),
  } as any;
};

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { get: jest.fn() } as any;
    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles are required', () => {
    reflector.get.mockReturnValue(undefined);
    const ctx = makeContext('EMPLOYEE');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when required roles array is empty', () => {
    reflector.get.mockReturnValue([]);
    const ctx = makeContext('EMPLOYEE');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user role matches required role', () => {
    reflector.get.mockReturnValue(['HR', 'SUPERADMIN']);
    const ctx = makeContext('HR');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies access when user role does not match', () => {
    reflector.get.mockReturnValue(['SUPERADMIN']);
    const ctx = makeContext('EMPLOYEE');
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('is case-insensitive for role comparison', () => {
    reflector.get.mockReturnValue(['HR']);
    const ctx = makeContext('hr');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies access when user is undefined', () => {
    reflector.get.mockReturnValue(['HR']);
    const context = {
      getHandler: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: undefined }),
      }),
    } as any;
    expect(guard.canActivate(context)).toBe(false);
  });

  it('allows SUPERADMIN when SUPERADMIN is in required roles', () => {
    reflector.get.mockReturnValue(['HR', 'SUPERADMIN']);
    const ctx = makeContext('SUPERADMIN');
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
