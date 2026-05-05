import { Test, TestingModule } from '@nestjs/testing';
import { ParticipationsController } from './participations.controller';
import { ParticipationsService } from './participations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('ParticipationsController', () => {
  let controller: ParticipationsController;
  let service: jest.Mocked<ParticipationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParticipationsController],
      providers: [
        {
          provide: ParticipationsService,
          useValue: { listForEmployee: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ParticipationsController>(ParticipationsController);
    service = module.get(ParticipationsService);
    jest.clearAllMocks();
  });

  describe('me', () => {
    it('returns participations for current employee', () => {
      const participations = [{ _id: 'p1', activityId: 'act-1', status: 'ACCEPTED' }];
      service.listForEmployee.mockReturnValue(participations as any);

      const req = { user: { userId: 'emp-id-1' } };
      const result = controller.me(req as any);

      expect(service.listForEmployee).toHaveBeenCalledWith('emp-id-1');
      expect(result).toBe(participations);
    });
  });
});
