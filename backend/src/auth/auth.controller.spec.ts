import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UnauthorizedException } from '@nestjs/common';

const mockTokenBundle = () => ({
  accessToken: 'access-tok',
  refreshToken: 'refresh-tok',
  refreshTokenExpiresAt: new Date(Date.now() + 86400000),
  user: { userId: 'user-id-1', email: 'a@a.com', role: 'EMPLOYEE' },
});

const mockRes = () => {
  const res: any = {};
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let usersService: jest.Mocked<UsersService>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            requestPasswordReset: jest.fn(),
            resetPassword: jest.fn(),
            changePassword: jest.fn(),
            loginAsUser: jest.fn(),
            loginWithGithub: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: { update: jest.fn(), findById: jest.fn() },
        },
        {
          provide: MailService,
          useValue: { sendTestEmail: jest.fn().mockResolvedValue({ sent: true }) },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(GithubAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    usersService = module.get(UsersService);
    mailService = module.get(MailService);
    jest.clearAllMocks();
  });

  // ── login ─────────────────────────────────────────────────────────────

  describe('login', () => {
    it('calls authService.login and sets refresh cookie', async () => {
      const bundle = mockTokenBundle();
      authService.login.mockResolvedValue(bundle as any);
      const res = mockRes();

      const result = await controller.login({ email: 'a@a.com', password: 'pw' } as any, res);

      expect(authService.login).toHaveBeenCalledWith('a@a.com', 'pw');
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-tok', expect.any(Object));
      expect(result).toBe(bundle);
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('refreshes using body token', async () => {
      const bundle = mockTokenBundle();
      authService.refresh.mockResolvedValue(bundle as any);
      const res = mockRes();
      const req = { cookies: {} };

      const result = await controller.refresh(
        { refreshToken: 'body-refresh-tok' } as any,
        req as any,
        res,
      );

      expect(authService.refresh).toHaveBeenCalledWith('body-refresh-tok');
      expect(result).toBe(bundle);
    });

    it('refreshes using cookie token when body is empty', async () => {
      const bundle = mockTokenBundle();
      authService.refresh.mockResolvedValue(bundle as any);
      const res = mockRes();
      const req = { cookies: { refreshToken: 'cookie-tok' } };

      await controller.refresh({} as any, req as any, res);
      expect(authService.refresh).toHaveBeenCalledWith('cookie-tok');
    });

    it('throws UnauthorizedException when no token provided', async () => {
      const res = mockRes();
      const req = { cookies: {} };
      await expect(controller.refresh({} as any, req as any, res)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('calls requestPasswordReset with email', async () => {
      authService.requestPasswordReset.mockResolvedValue({ message: 'ok' } as any);
      const result = await controller.forgotPassword({ email: 'a@a.com' } as any);
      expect(authService.requestPasswordReset).toHaveBeenCalledWith('a@a.com');
      expect(result).toHaveProperty('message');
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('calls resetPassword with token and newPassword', async () => {
      authService.resetPassword.mockResolvedValue({ message: 'ok' } as any);
      const result = await controller.resetPassword({
        token: 'tok123',
        newPassword: 'NewP@ss',
      } as any);
      expect(authService.resetPassword).toHaveBeenCalledWith('tok123', 'NewP@ss');
      expect(result).toHaveProperty('message');
    });
  });

  // ── me ────────────────────────────────────────────────────────────────

  describe('me', () => {
    it('returns user from request', () => {
      const req = { user: { userId: 'u1', role: 'EMPLOYEE' } };
      const result = controller.me(req as any);
      expect(result).toBe(req.user);
    });
  });

  // ── changePassword ────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('delegates to authService.changePassword', async () => {
      authService.changePassword.mockResolvedValue({ message: 'ok' } as any);
      const req = { user: { userId: 'user-id-1' } };
      const result = await controller.changePassword(req as any, { newPassword: 'NewP@ss' } as any);
      expect(authService.changePassword).toHaveBeenCalledWith('user-id-1', 'NewP@ss');
      expect(result).toHaveProperty('message');
    });
  });

  // ── logout ────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('clears refresh cookie and calls authService.logout', async () => {
      authService.logout.mockResolvedValue({ message: 'ok' } as any);
      const res = mockRes();
      const req = { user: { userId: 'user-id-1' } };

      const result = await controller.logout(req as any, res);

      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
      expect(authService.logout).toHaveBeenCalledWith('user-id-1');
      expect(result).toHaveProperty('message');
    });
  });

  // ── completeProfile ───────────────────────────────────────────────────

  describe('completeProfile', () => {
    it('updates user profile and returns safe payload', async () => {
      const updatedUser = {
        _id: 'user-id-1',
        name: 'Alice Martin',
        firstName: 'Alice',
        lastName: 'Martin',
        email: 'alice@x.com',
        role: 'EMPLOYEE',
        photoUrl: null,
        mustChangePassword: false,
        isProfileComplete: true,
      };
      usersService.update.mockResolvedValue(updatedUser as any);

      const req = { user: { userId: 'user-id-1' } };
      const body = { firstName: 'Alice', lastName: 'Martin' } as any;
      const result = await controller.completeProfile(req as any, body, {});

      expect(usersService.update).toHaveBeenCalledWith(
        'user-id-1',
        expect.objectContaining({ firstName: 'Alice', lastName: 'Martin', isProfileComplete: true }),
      );
      expect(result).toHaveProperty('message');
      expect(result.user).toMatchObject({ name: 'Alice Martin' });
    });

    it('includes photoUrl when photo file uploaded', async () => {
      usersService.update.mockResolvedValue({
        _id: 'u1', name: 'A', firstName: 'A', lastName: 'B',
        email: 'a@a.com', role: 'EMPLOYEE', photoUrl: 'url', mustChangePassword: false, isProfileComplete: true,
      } as any);
      const req = { user: { userId: 'u1' } };
      const files = { photo: [{ filename: 'avatar.jpg' }] };
      await controller.completeProfile(req as any, { firstName: 'A', lastName: 'B' } as any, files as any);
      expect(usersService.update).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ photoUrl: expect.stringContaining('avatar.jpg') }),
      );
    });
  });
});
