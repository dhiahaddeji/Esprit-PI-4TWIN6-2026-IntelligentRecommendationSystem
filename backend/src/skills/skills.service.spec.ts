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
  savoir: [{ name: 'Python', level: 'HIGH' }],
  savoir_faire: [],
  savoir_etre: [],
  status: 'PENDING',
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeUser = (overrides: any = {}) => ({
  _id: 'emp-id-1',
  email: 'alice@x.com',
  savoir: [{ name: 'Python', level: 'HIGH' }],
  savoir_faire: [],
  savoir_etre: [],
  globalScore: 75,
  ...overrides,
});

describe('SkillsService', () => {
  let service: SkillsService;
  let skillRequestModel: any;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    skillRequestModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
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
        {
          provide: getModelToken(SkillRequest.name),
          useValue: mockModel,
        },
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

  // ── getMySkills ───────────────────────────────────────────────────────

  describe('getMySkills', () => {
    it('returns approved skills and pending request', async () => {
      const user = makeUser();
      const pending = makeRequest();
      usersService.findById.mockResolvedValue(user as any);
      skillRequestModel.findOne.mockResolvedValue(pending);

      const result = await service.getMySkills('emp-id-1');

      expect(result.approved.savoir).toEqual(user.savoir);
      expect(result.approved.globalScore).toBe(75);
      expect(result.pending).toBeDefined();
      expect(result.pending?._id).toBe('req-id-1');
    });

    it('returns null pending when no pending request', async () => {
      usersService.findById.mockResolvedValue(makeUser() as any);
      skillRequestModel.findOne.mockResolvedValue(null);

      const result = await service.getMySkills('emp-id-1');
      expect(result.pending).toBeNull();
    });

    it('returns empty arrays when user has no skills', async () => {
      usersService.findById.mockResolvedValue(makeUser({
        savoir: undefined,
        savoir_faire: undefined,
        savoir_etre: undefined,
        globalScore: undefined,
      }) as any);
      skillRequestModel.findOne.mockResolvedValue(null);

      const result = await service.getMySkills('emp-id-1');
      expect(result.approved.savoir).toEqual([]);
      expect(result.approved.globalScore).toBe(0);
    });
  });

  // ── getPending ────────────────────────────────────────────────────────

  describe('getPending', () => {
    it('returns pending skill requests sorted by date', async () => {
      const requests = [makeRequest()];
      skillRequestModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(requests),
      });

      const result = await service.getPending();
      expect(result).toBe(requests);
      expect(skillRequestModel.find).toHaveBeenCalledWith({ status: 'PENDING' });
    });
  });

  // ── getAll ────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns all skill requests sorted by date', async () => {
      const requests = [makeRequest(), makeRequest({ _id: 'req-id-2', status: 'APPROVED' })];
      skillRequestModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(requests),
      });

      const result = await service.getAll();
      expect(result).toBe(requests);
      expect(skillRequestModel.find).toHaveBeenCalledWith();
    });
  });

  // ── approve ───────────────────────────────────────────────────────────

  describe('approve', () => {
    it('throws NotFoundException when request not found', async () => {
      skillRequestModel.findById.mockResolvedValue(null);
      await expect(service.approve('bad-id', 'mgr-1')).rejects.toThrow(NotFoundException);
    });

    it('updates user skills and marks request as approved via req.save()', async () => {
      const req = makeRequest({
        savoir: [{ name: 'Python', level: 'HIGH' }],
        savoir_faire: [{ name: 'Git', level: 'MEDIUM' }],
        savoir_etre: [],
      });
      skillRequestModel.findById.mockResolvedValue(req);
      usersService.update.mockResolvedValue(makeUser() as any);

      await service.approve('req-id-1', 'mgr-1', 'Good work');

      expect(usersService.update).toHaveBeenCalledWith(
        'emp-id-1',
        expect.objectContaining({
          savoir: req.savoir,
          savoir_faire: req.savoir_faire,
        }),
      );
      expect(req.status).toBe('APPROVED');
      expect(req.reviewedBy).toBe('mgr-1');
      expect(req.save).toHaveBeenCalled();
    });
  });
});
