import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeController } from './employee.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('EmployeeController', () => {
  let controller: EmployeeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeController],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EmployeeController>(EmployeeController);
  });

  describe('getTasks', () => {
    it('returns message and user from request', () => {
      const req = { user: { userId: 'emp-1', role: 'EMPLOYEE' } };
      const result = controller.getTasks(req as any);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('user', req.user);
    });
  });
});
