import { Test, TestingModule } from '@nestjs/testing';
import { HrController } from './hr.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('HrController', () => {
  let controller: HrController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HrController],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<HrController>(HrController);
  });

  describe('getProfile', () => {
    it('returns message and user from request', () => {
      const req = { user: { userId: 'hr-1', role: 'HR' } };
      const result = controller.getProfile(req as any);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('user', req.user);
    });
  });
});
