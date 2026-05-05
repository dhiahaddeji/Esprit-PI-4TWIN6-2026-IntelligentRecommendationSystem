import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../users/users.service';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UsersService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersService = module.get(UsersService);
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('throws UnauthorizedException when token type is not access', async () => {
      await expect(
        strategy.validate({ type: 'refresh', sub: 'user-1', role: 'EMPLOYEE' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns user payload from token when role is present', async () => {
      const result = await strategy.validate({
        sub: 'user-1', email: 'alice@x.com', role: 'EMPLOYEE', name: 'Alice',
      });
      expect(result).toEqual({
        userId: 'user-1', name: 'Alice', email: 'alice@x.com', role: 'EMPLOYEE',
      });
    });

    it('fetches fresh role from DB when role is missing in token', async () => {
      usersService.findById.mockResolvedValue({ role: 'MANAGER', name: 'Bob' } as any);

      const result = await strategy.validate({
        sub: 'user-2', email: 'bob@x.com', role: undefined, name: 'Bob',
      });

      expect(usersService.findById).toHaveBeenCalledWith('user-2');
      expect(result.role).toBe('MANAGER');
    });

    it('keeps token values when DB lookup fails', async () => {
      usersService.findById.mockRejectedValue(new Error('DB error'));

      const result = await strategy.validate({
        sub: 'user-3', email: 'carol@x.com', role: undefined, name: 'Carol',
      });

      expect(result.userId).toBe('user-3');
    });

    it('uses token name when DB user has no name', async () => {
      usersService.findById.mockResolvedValue({ role: 'HR', name: null } as any);

      const result = await strategy.validate({
        sub: 'user-4', email: 'dave@x.com', role: undefined, name: 'Dave',
      });

      expect(result.name).toBe('Dave');
    });

    it('accepts token with type=access', async () => {
      const result = await strategy.validate({
        type: 'access', sub: 'user-1', email: 'e@x.com', role: 'EMPLOYEE',
      });
      expect(result).toHaveProperty('userId', 'user-1');
    });
  });
});
