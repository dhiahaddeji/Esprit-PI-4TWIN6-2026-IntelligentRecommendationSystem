import { Test, TestingModule } from '@nestjs/testing';
import { FaceController } from './face.controller';
import { FaceService } from './face.service';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('FaceController', () => {
  let controller: FaceController;
  let faceService: jest.Mocked<FaceService>;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaceController],
      providers: [
        {
          provide: FaceService,
          useValue: {
            registerFace: jest.fn(),
            loginWithFace: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: { loginAsUser: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FaceController>(FaceController);
    faceService = module.get(FaceService);
    authService = module.get(AuthService);
    jest.clearAllMocks();
  });

  // ── register ──────────────────────────────────────────────────────────

  describe('register', () => {
    it('throws BadRequestException when no image provided', async () => {
      await expect(
        controller.register({ user: { userId: 'u1' } } as any, ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('registers face and returns success message', async () => {
      faceService.registerFace.mockResolvedValue(undefined);
      const req = { user: { userId: 'u1' } };
      const result = await controller.register(req as any, 'base64imagedata');

      expect(faceService.registerFace).toHaveBeenCalledWith('u1', 'base64imagedata');
      expect(result).toHaveProperty('message', 'Face registered successfully');
    });

    it('uses sub as fallback when userId is not available', async () => {
      faceService.registerFace.mockResolvedValue(undefined);
      const req = { user: { sub: 'u2' } };
      await controller.register(req as any, 'imagedata');
      expect(faceService.registerFace).toHaveBeenCalledWith('u2', 'imagedata');
    });
  });

  // ── login ─────────────────────────────────────────────────────────────

  describe('login', () => {
    it('throws BadRequestException when no image provided', async () => {
      await expect(controller.login('')).rejects.toThrow(BadRequestException);
    });

    it('throws UnauthorizedException when face not recognized', async () => {
      faceService.loginWithFace.mockResolvedValue(null);
      await expect(controller.login('imagedata')).rejects.toThrow(UnauthorizedException);
    });

    it('returns auth tokens when face recognized', async () => {
      const user = { userId: 'u1', role: 'EMPLOYEE' };
      const tokens = { accessToken: 'tok', refreshToken: 'rtok' };
      faceService.loginWithFace.mockResolvedValue(user as any);
      authService.loginAsUser.mockResolvedValue(tokens as any);

      const result = await controller.login('imagedata');

      expect(faceService.loginWithFace).toHaveBeenCalledWith('imagedata');
      expect(authService.loginAsUser).toHaveBeenCalledWith(user);
      expect(result).toBe(tokens);
    });
  });
});
