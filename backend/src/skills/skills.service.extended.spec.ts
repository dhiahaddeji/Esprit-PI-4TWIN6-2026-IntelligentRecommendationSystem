import { Test, TestingModule } from '@nestjs/testing';
import { SkillsService } from './skills.service';
import { getModelToken } from '@nestjs/mongoose';
import { SkillRequest } from './skill-request.schema';
import { UsersService } from '../users/users.service';
import { NotFoundException } from '@nestjs/common';

const makeRequest = (overrides: any = {}) => ({
  _id: 'req-id-1',
  employeeId: 'emp-id-1',
  employeeName: 'Alice',
  savoir: [{ name: 'Python', level: 'HIGH', score: 75 }],
  savoir_faire: [{ name: 'Git', level: 'MEDIUM', score: 50 }],
  savoir_etre: [],
  status: 'PENDING',
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeUser = (overrides: any = {}) => ({
  _id: 'emp-id-1',
  savoir: [{ name: 'Python', level: 'HIGH', score: 75 }],
  savoir_faire: [],
  savoir_etre: [],
  globalScore: 75,
  ...overrides,
});

describe('SkillsService — extended', () => {
  let service: SkillsService;
  let skillRequestModel: any;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    skillRequestModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({}),
    };

    const mockModel = jest.fn().mockImplementation((data: any) => ({
      ...makeRequest(),
      ...data,
      save: jest.fn().mockResolvedValue(makeRequest(data)),
    }));
    Object.assign(mockModel, skillRequestModel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillsService,
        { provide: getModelToken(SkillRequest.name), useValue: mockModel },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
    usersService = module.get(UsersService);
    Object.assign(service['skillRequestModel'], skillRequestModel);
    jest.clearAllMocks();
  });

  // ── submitRequest ─────────────────────────────────────────────────────

  describe('submitRequest', () => {
    it('deletes pending request then creates a new one', async () => {
      const newReq = makeRequest();
      const saveMock = jest.fn().mockResolvedValue(newReq);

      // The model is used as constructor: new this.skillRequestModel(...)
      const ctor = service['skillRequestModel'] as any;
      ctor.mockImplementation((data: any) => ({ ...data, save: saveMock }));

      const result = await service.submitRequest(
        'emp-id-1', 'Alice',
        [{ name: 'Python', level: 'HIGH', score: 75 }],
        [],
        [],
      );

      expect(skillRequestModel.deleteMany).toHaveBeenCalledWith({
        employeeId: 'emp-id-1',
        status: 'PENDING',
      });
      expect(saveMock).toHaveBeenCalled();
    });
  });

  // ── reject ────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('throws NotFoundException when request not found', async () => {
      skillRequestModel.findById.mockResolvedValue(null);
      await expect(service.reject('bad-id', 'mgr-1')).rejects.toThrow(NotFoundException);
    });

    it('marks request as REJECTED and saves', async () => {
      const req = makeRequest();
      skillRequestModel.findById.mockResolvedValue(req);

      await service.reject('req-id-1', 'mgr-1', 'Insufficient evidence');

      expect(req.status).toBe('REJECTED');
      expect(req.reviewedBy).toBe('mgr-1');
      expect(req.reviewNote).toBe('Insufficient evidence');
      expect(req.save).toHaveBeenCalled();
    });

    it('uses empty string when no note provided', async () => {
      const req = makeRequest();
      skillRequestModel.findById.mockResolvedValue(req);
      await service.reject('req-id-1', 'mgr-1');
      expect(req.reviewNote).toBe('');
    });
  });

  // ── postActivityEvaluation ────────────────────────────────────────────

  describe('postActivityEvaluation', () => {
    it('upgrades matching skills and recomputes globalScore', async () => {
      const user = makeUser({
        savoir: [{ name: 'Python', level: 'MEDIUM', score: 50 }],
        savoir_faire: [],
        savoir_etre: [],
      });
      usersService.findById.mockResolvedValue(user as any);
      usersService.update.mockResolvedValue(user as any);

      await service.postActivityEvaluation('emp-id-1', [
        { skillName: 'Python', newLevel: 'HIGH' },
      ]);

      expect(usersService.update).toHaveBeenCalledWith(
        'emp-id-1',
        expect.objectContaining({
          savoir: expect.arrayContaining([
            expect.objectContaining({ name: 'Python', level: 'HIGH' }),
          ]),
        }),
      );
    });

    it('leaves skills unchanged when no matching skill name', async () => {
      const user = makeUser({
        savoir: [{ name: 'JavaScript', level: 'LOW', score: 25 }],
      });
      usersService.findById.mockResolvedValue(user as any);
      usersService.update.mockResolvedValue(user as any);

      await service.postActivityEvaluation('emp-id-1', [
        { skillName: 'Python', newLevel: 'HIGH' },
      ]);

      const call = usersService.update.mock.calls[0][1];
      expect(call.savoir[0].level).toBe('LOW');
    });

    it('handles empty skillUpdates array', async () => {
      usersService.findById.mockResolvedValue(makeUser() as any);
      usersService.update.mockResolvedValue(makeUser() as any);
      await service.postActivityEvaluation('emp-id-1', []);
      expect(usersService.update).toHaveBeenCalled();
    });
  });
});
