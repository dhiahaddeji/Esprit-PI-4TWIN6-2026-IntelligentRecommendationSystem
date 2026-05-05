import { Test, TestingModule } from '@nestjs/testing';
import { ManagerController } from './manager.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('ManagerController', () => {
  let controller: ManagerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManagerController],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ManagerController>(ManagerController);
  });

  describe('getDashboard', () => {
    it('returns message and user from request', () => {
      const req = { user: { userId: 'mgr-1', role: 'MANAGER' } };
      const result = controller.getDashboard(req as any);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('user', req.user);
    });
  });
});
