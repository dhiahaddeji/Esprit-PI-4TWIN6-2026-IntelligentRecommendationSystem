import { Test, TestingModule } from '@nestjs/testing';
import { ManagerService } from './manager.service';
import { getModelToken } from '@nestjs/mongoose';
import { Manager } from './schemas/manager.schema';

describe('ManagerService', () => {
  let service: ManagerService;
  let managerModel: any;

  beforeEach(async () => {
    managerModel = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManagerService,
        { provide: getModelToken(Manager.name), useValue: managerModel },
      ],
    }).compile();

    service = module.get<ManagerService>(ManagerService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a manager record for the given userId', async () => {
      const created = { _id: 'mgr-doc-1', user_id: 'user-1' };
      managerModel.create.mockResolvedValue(created);

      const result = await service.create('user-1');
      expect(managerModel.create).toHaveBeenCalledWith({ user_id: 'user-1' });
      expect(result).toBe(created);
    });
  });
});
