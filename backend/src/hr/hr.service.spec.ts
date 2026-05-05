import { Test, TestingModule } from '@nestjs/testing';
import { HrService } from './hr.service';
import { getModelToken } from '@nestjs/mongoose';
import { HR } from './schemas/hr.schema';

describe('HrService', () => {
  let service: HrService;
  let hrModel: any;

  beforeEach(async () => {
    hrModel = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HrService,
        { provide: getModelToken(HR.name), useValue: hrModel },
      ],
    }).compile();

    service = module.get<HrService>(HrService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates an HR record for the given userId', async () => {
      const created = { _id: 'hr-doc-1', user_id: 'user-1' };
      hrModel.create.mockResolvedValue(created);

      const result = await service.create('user-1');
      expect(hrModel.create).toHaveBeenCalledWith({ user_id: 'user-1' });
      expect(result).toBe(created);
    });
  });
});
