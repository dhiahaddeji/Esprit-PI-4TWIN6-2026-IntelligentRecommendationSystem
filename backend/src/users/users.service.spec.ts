import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const makeUser = (overrides: any = {}) => ({
  _id: 'user-id-1',
  email: 'test@example.com',
  password: '$2b$10$hashedpw',
  role: 'EMPLOYEE',
  name: 'Test User',
  ...overrides,
});

const mockUserModel = {
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  exec: jest.fn(),
};

// chainable exec()
function chainable(value: any) {
  const obj = { exec: jest.fn().mockResolvedValue(value) };
  return obj;
}

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ── findByEmail ───────────────────────────────────────────────────────

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      const user = makeUser();
      mockUserModel.findOne.mockResolvedValue(user);
      const result = await service.findByEmail('test@example.com');
      expect(result).toBe(user);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('returns null when not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      const result = await service.findByEmail('unknown@example.com');
      expect(result).toBeNull();
    });
  });

  // ── findByGithubId ────────────────────────────────────────────────────

  describe('findByGithubId', () => {
    it('queries by githubId', async () => {
      const user = makeUser({ githubId: 'gh123' });
      mockUserModel.findOne.mockResolvedValue(user);
      const result = await service.findByGithubId('gh123');
      expect(result).toBe(user);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ githubId: 'gh123' });
    });
  });

  // ── findSuperAdmin ────────────────────────────────────────────────────

  describe('findSuperAdmin', () => {
    it('queries by SUPERADMIN role', async () => {
      const admin = makeUser({ role: 'SUPERADMIN' });
      mockUserModel.findOne.mockResolvedValue(admin);
      const result = await service.findSuperAdmin();
      expect(result).toBe(admin);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ role: 'SUPERADMIN' });
    });
  });

  // ── create ────────────────────────────────────────────────────────────

  describe('create', () => {
    it('hashes password before saving', async () => {
      mockedBcrypt.hash.mockResolvedValue('$2b$10$hashed' as never);
      const saveMock = jest.fn().mockResolvedValue(makeUser());
      const mockConstructor = jest.fn().mockImplementation(() => ({ save: saveMock }));

      const moduleRef = await Test.createTestingModule({
        providers: [
          UsersService,
          {
            provide: getModelToken(User.name),
            useValue: Object.assign(mockConstructor, mockUserModel),
          },
        ],
      }).compile();

      const svc = moduleRef.get<UsersService>(UsersService);
      await svc.create({ email: 'new@x.com', password: 'plaintext' });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('plaintext', 10);
    });
  });

  // ── update ────────────────────────────────────────────────────────────

  describe('update', () => {
    it('returns updated user on success', async () => {
      const updated = makeUser({ name: 'Updated Name' });
      mockUserModel.findByIdAndUpdate.mockReturnValue(chainable(updated));
      const result = await service.update('user-id-1', { name: 'Updated Name' });
      expect(result).toBe(updated);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(chainable(null));
      await expect(service.update('nonexistent', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('hashes password when provided in plain text', async () => {
      mockedBcrypt.hash.mockResolvedValue('$2b$10$hashed' as never);
      const updated = makeUser();
      mockUserModel.findByIdAndUpdate.mockReturnValue(chainable(updated));
      await service.update('user-id-1', { password: 'plaintext' });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('plaintext', 10);
    });

    it('does not re-hash bcrypt password', async () => {
      const updated = makeUser();
      mockUserModel.findByIdAndUpdate.mockReturnValue(chainable(updated));
      await service.update('user-id-1', { password: '$2b$10$alreadyhashed' });
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
    });
  });

  // ── updateOnlineStatus ────────────────────────────────────────────────

  describe('updateOnlineStatus', () => {
    it('updates en_ligne field', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(makeUser());
      await service.updateOnlineStatus('user-id-1', true);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith('user-id-1', {
        en_ligne: true,
      });
    });
  });

  // ── setRefreshToken ───────────────────────────────────────────────────

  describe('setRefreshToken', () => {
    it('hashes token before storing', async () => {
      mockedBcrypt.hash.mockResolvedValue('$2b$10$refreshhash' as never);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(makeUser());

      const expiresAt = new Date();
      await service.setRefreshToken('user-id-1', 'raw-refresh-token', expiresAt);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('raw-refresh-token', 10);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-1',
        expect.objectContaining({ refreshTokenHash: '$2b$10$refreshhash', refreshTokenExpiresAt: expiresAt }),
      );
    });
  });

  // ── clearRefreshToken ─────────────────────────────────────────────────

  describe('clearRefreshToken', () => {
    it('nullifies refreshTokenHash and refreshTokenExpiresAt', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(makeUser());
      await service.clearRefreshToken('user-id-1');
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith('user-id-1', {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      });
    });
  });

  // ── setPasswordResetToken ─────────────────────────────────────────────

  describe('setPasswordResetToken', () => {
    it('stores token hash and expiry', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(makeUser());
      const expiresAt = new Date();
      await service.setPasswordResetToken('user-id-1', 'token-hash', expiresAt);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith('user-id-1', {
        resetPasswordTokenHash: 'token-hash',
        resetPasswordExpiresAt: expiresAt,
      });
    });
  });

  // ── clearPasswordResetToken ───────────────────────────────────────────

  describe('clearPasswordResetToken', () => {
    it('nullifies reset token fields', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(makeUser());
      await service.clearPasswordResetToken('user-id-1');
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith('user-id-1', {
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
      });
    });
  });

  // ── findByResetTokenHash ──────────────────────────────────────────────

  describe('findByResetTokenHash', () => {
    it('finds user by reset token hash', async () => {
      const user = makeUser();
      mockUserModel.findOne.mockReturnValue(chainable(user));
      const result = await service.findByResetTokenHash('some-hash');
      expect(result).toBe(user);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        resetPasswordTokenHash: 'some-hash',
      });
    });

    it('returns null when no matching token', async () => {
      mockUserModel.findOne.mockReturnValue(chainable(null));
      const result = await service.findByResetTokenHash('unknown-hash');
      expect(result).toBeNull();
    });
  });
});
