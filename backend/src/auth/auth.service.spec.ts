import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MailService } from '../mail/mail.service';
import { UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const makeUser = (overrides: any = {}) => ({
  _id: { toString: () => 'user-id-1' },
  email: 'test@example.com',
  password: '$2b$10$hashedpw',
  role: 'EMPLOYEE',
  name: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  matricule: 'EMP001',
  mustChangePassword: false,
  isProfileComplete: true,
  status: 'active',
  photoUrl: null,
  passwordExpiresAt: null,
  resetPasswordExpiresAt: null,
  refreshTokenHash: null,
  refreshTokenExpiresAt: null,
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let auditLogsService: jest.Mocked<AuditLogsService>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findByGithubId: jest.fn(),
            findSuperAdmin: jest.fn(),
            findById: jest.fn(),
            findByIdWithRefreshToken: jest.fn(),
            findByResetTokenHash: jest.fn(),
            findByRole: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            updateOnlineStatus: jest.fn(),
            setRefreshToken: jest.fn(),
            clearRefreshToken: jest.fn(),
            setPasswordResetToken: jest.fn(),
            clearPasswordResetToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
            decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config: Record<string, string> = {
                JWT_ACCESS_TTL: '15m',
                JWT_REFRESH_TTL: '7d',
                JWT_REFRESH_SECRET: 'refresh-secret',
                RESET_PASSWORD_TTL: '15m',
                FRONTEND_URL: 'http://localhost:5173',
              };
              return config[key];
            }),
          },
        },
        {
          provide: AuditLogsService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    auditLogsService = module.get(AuditLogsService);
    mailService = module.get(MailService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── validateUser ─────────────────────────────────────────────────────

  describe('validateUser', () => {
    it('throws UnauthorizedException when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(service.validateUser('x@x.com', 'pw')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when password does not match', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser() as any);
      mockedBcrypt.compare.mockResolvedValue(false as never);
      await expect(service.validateUser('test@example.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when temporary password has expired', async () => {
      const expired = new Date(Date.now() - 1000);
      usersService.findByEmail.mockResolvedValue(makeUser({ passwordExpiresAt: expired }) as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      await expect(service.validateUser('test@example.com', 'pw')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns user on valid credentials', async () => {
      const user = makeUser();
      usersService.findByEmail.mockResolvedValue(user as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      const result = await service.validateUser('test@example.com', 'correct');
      expect(result).toBe(user);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens and user payload on successful login', async () => {
      const user = makeUser();
      usersService.findByEmail.mockResolvedValue(user as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      usersService.updateOnlineStatus.mockResolvedValue(undefined as any);
      usersService.setRefreshToken.mockResolvedValue(undefined as any);
      auditLogsService.log.mockResolvedValue(undefined as any);

      const result = await service.login('test@example.com', 'password');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toMatchObject({
        email: 'test@example.com',
        role: 'EMPLOYEE',
      });
      expect(usersService.updateOnlineStatus).toHaveBeenCalledWith('user-id-1', true);
    });

    it('calls auditLogsService.log on successful login', async () => {
      const user = makeUser();
      usersService.findByEmail.mockResolvedValue(user as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      usersService.updateOnlineStatus.mockResolvedValue(undefined as any);
      usersService.setRefreshToken.mockResolvedValue(undefined as any);

      await service.login('test@example.com', 'password');

      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_LOGIN' }),
      );
    });
  });

  // ── loginWithGithub ───────────────────────────────────────────────────

  describe('loginWithGithub', () => {
    const githubProfile = { githubId: 'gh123', email: 'admin@admin.com', name: 'SuperAdmin' };

    it('throws ForbiddenException when no SuperAdmin exists', async () => {
      usersService.findByGithubId.mockResolvedValue(null);
      usersService.findSuperAdmin.mockResolvedValue(null);
      await expect(service.loginWithGithub(githubProfile)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('links githubId to SuperAdmin and returns tokens', async () => {
      const admin = makeUser({ role: 'SUPERADMIN' });
      usersService.findByGithubId.mockResolvedValue(null);
      usersService.findSuperAdmin
        .mockResolvedValueOnce(admin as any)
        .mockResolvedValueOnce(admin as any);
      usersService.update.mockResolvedValue(admin as any);
      usersService.updateOnlineStatus.mockResolvedValue(undefined as any);
      usersService.setRefreshToken.mockResolvedValue(undefined as any);

      const result = await service.loginWithGithub(githubProfile);
      expect(result).toHaveProperty('accessToken');
      expect(usersService.update).toHaveBeenCalledWith('user-id-1', { githubId: 'gh123' });
    });

    it('unlinks githubId from non-SUPERADMIN user before re-linking', async () => {
      const empUser = makeUser({ role: 'EMPLOYEE' });
      const admin = makeUser({ role: 'SUPERADMIN' });
      usersService.findByGithubId.mockResolvedValue(empUser as any);
      usersService.update.mockResolvedValue(empUser as any);
      usersService.findSuperAdmin
        .mockResolvedValueOnce(admin as any)
        .mockResolvedValueOnce(admin as any);
      usersService.updateOnlineStatus.mockResolvedValue(undefined as any);
      usersService.setRefreshToken.mockResolvedValue(undefined as any);

      await service.loginWithGithub(githubProfile);
      expect(usersService.update).toHaveBeenCalledWith('user-id-1', { githubId: null });
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('throws UnauthorizedException on invalid token', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('invalid'); });
      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token type is not refresh', async () => {
      jwtService.verify.mockReturnValue({ sub: 'uid', type: 'access' });
      await expect(service.refresh('access-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when no hash stored', async () => {
      jwtService.verify.mockReturnValue({ sub: 'uid', type: 'refresh' });
      usersService.findByIdWithRefreshToken.mockResolvedValue(
        makeUser({ refreshTokenHash: null }) as any,
      );
      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when refresh token is expired', async () => {
      jwtService.verify.mockReturnValue({ sub: 'uid', type: 'refresh' });
      const expired = new Date(Date.now() - 1000);
      usersService.findByIdWithRefreshToken.mockResolvedValue(
        makeUser({ refreshTokenHash: 'hash', refreshTokenExpiresAt: expired }) as any,
      );
      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('returns new tokens on valid refresh', async () => {
      jwtService.verify.mockReturnValue({ sub: 'uid', type: 'refresh' });
      const future = new Date(Date.now() + 86400000);
      usersService.findByIdWithRefreshToken.mockResolvedValue(
        makeUser({ refreshTokenHash: '$2b$10$hash', refreshTokenExpiresAt: future }) as any,
      );
      mockedBcrypt.compare.mockResolvedValue(true as never);
      usersService.setRefreshToken.mockResolvedValue(undefined as any);

      const result = await service.refresh('valid-refresh-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  // ── requestPasswordReset ──────────────────────────────────────────────

  describe('requestPasswordReset', () => {
    it('returns generic message even when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const result = await service.requestPasswordReset('unknown@x.com');
      expect(result).toHaveProperty('message');
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('sends reset email and stores token hash when user exists', async () => {
      const user = makeUser();
      usersService.findByEmail.mockResolvedValue(user as any);
      usersService.setPasswordResetToken.mockResolvedValue(undefined as any);

      const result = await service.requestPasswordReset('test@example.com');

      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'test@example.com' }),
      );
      expect(result).toHaveProperty('message');
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('throws BadRequestException when token is empty', async () => {
      await expect(service.resetPassword('', 'newpw')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when no user matches token hash', async () => {
      usersService.findByResetTokenHash.mockResolvedValue(null);
      await expect(service.resetPassword('token123', 'newpw')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when reset token is expired', async () => {
      const expired = new Date(Date.now() - 1000);
      usersService.findByResetTokenHash.mockResolvedValue(
        makeUser({ resetPasswordExpiresAt: expired }) as any,
      );
      await expect(service.resetPassword('token123', 'newpw')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('updates password and clears tokens on success', async () => {
      const future = new Date(Date.now() + 86400000);
      usersService.findByResetTokenHash.mockResolvedValue(
        makeUser({ resetPasswordExpiresAt: future }) as any,
      );
      usersService.update.mockResolvedValue(makeUser() as any);
      usersService.clearPasswordResetToken.mockResolvedValue(undefined as any);
      usersService.clearRefreshToken.mockResolvedValue(undefined as any);

      const result = await service.resetPassword('validtoken', 'NewP@ssw0rd');
      expect(result).toHaveProperty('message');
      expect(usersService.update).toHaveBeenCalled();
      expect(usersService.clearPasswordResetToken).toHaveBeenCalled();
      expect(usersService.clearRefreshToken).toHaveBeenCalled();
    });
  });

  // ── logout ────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('sets user offline and clears refresh token', async () => {
      usersService.updateOnlineStatus.mockResolvedValue(undefined as any);
      usersService.clearRefreshToken.mockResolvedValue(undefined as any);

      const result = await service.logout('user-id-1');

      expect(usersService.updateOnlineStatus).toHaveBeenCalledWith('user-id-1', false);
      expect(usersService.clearRefreshToken).toHaveBeenCalledWith('user-id-1');
      expect(result).toHaveProperty('message');
    });
  });

  // ── changePassword ────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('hashes the password and updates user', async () => {
      const user = makeUser();
      usersService.findById.mockResolvedValue(user as any);
      mockedBcrypt.hash.mockResolvedValue('$2b$10$newhash' as never);
      usersService.update.mockResolvedValue(user as any);
      usersService.clearRefreshToken.mockResolvedValue(undefined as any);

      const result = await service.changePassword('user-id-1', 'NewP@ssw0rd');

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('NewP@ssw0rd', 10);
      expect(usersService.update).toHaveBeenCalledWith(
        'user-id-1',
        expect.objectContaining({ mustChangePassword: false }),
      );
      expect(result).toHaveProperty('message');
    });
  });

  // ── loginAsUser ───────────────────────────────────────────────────────

  describe('loginAsUser', () => {
    it('returns tokens on face login', async () => {
      const user = makeUser();
      usersService.updateOnlineStatus.mockResolvedValue(undefined as any);
      usersService.setRefreshToken.mockResolvedValue(undefined as any);

      const result = await service.loginAsUser(user);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(usersService.updateOnlineStatus).toHaveBeenCalledWith('user-id-1', true);
    });
  });
});
