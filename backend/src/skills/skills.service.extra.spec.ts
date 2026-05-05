import { Test, TestingModule } from '@nestjs/testing';
import { SkillsService } from './skills.service';
import { getModelToken } from '@nestjs/mongoose';
import { SkillRequest } from './skill-request.schema';
import { UsersService } from '../users/users.service';

const makeUser = (overrides: any = {}) => ({
  _id: 'emp-id-1',
  name: 'Alice',
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@x.com',
  departement_id: 'dept-1',
  savoir: [{ name: 'Python', level: 'HIGH', score: 75 }],
  savoir_faire: [{ name: 'Git', level: 'MEDIUM', score: 50 }],
  savoir_etre: [],
  globalScore: 75,
  yearsExperience: 3,
  matricule: 'EMP001',
  ...overrides,
});

describe('SkillsService — extra coverage', () => {
  let service: SkillsService;
  let usersService: jest.Mocked<UsersService>;
  let skillRequestModel: any;

  beforeEach(async () => {
    skillRequestModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({}),
    };

    const mockModel = jest.fn().mockImplementation((data: any) => ({
      ...data,
      save: jest.fn().mockResolvedValue(data),
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
            findByRole: jest.fn(),
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

  // ── getEmployeeSkills ─────────────────────────────────────────────────

  describe('getEmployeeSkills', () => {
    it('returns structured skills for given employee', async () => {
      const user = makeUser();
      usersService.findById.mockResolvedValue(user as any);

      const result = await service.getEmployeeSkills('emp-id-1');

      expect(usersService.findById).toHaveBeenCalledWith('emp-id-1');
      expect(result.savoir).toEqual(user.savoir);
      expect(result.savoir_faire).toEqual(user.savoir_faire);
      expect(result.globalScore).toBe(75);
    });

    it('returns empty arrays when user has no skills', async () => {
      usersService.findById.mockResolvedValue(makeUser({
        savoir: undefined, savoir_faire: undefined, savoir_etre: undefined, globalScore: undefined,
      }) as any);

      const result = await service.getEmployeeSkills('emp-id-1');
      expect(result.savoir).toEqual([]);
      expect(result.globalScore).toBe(0);
    });
  });

  // ── getSkillsAnalytics ────────────────────────────────────────────────

  describe('getSkillsAnalytics', () => {
    it('returns analytics with department breakdown', async () => {
      const employees = [
        makeUser({ departement_id: 'dept-1', globalScore: 75 }),
        makeUser({ _id: 'emp-2', departement_id: 'dept-1', globalScore: 50 }),
        makeUser({ _id: 'emp-3', departement_id: 'dept-2', globalScore: 80 }),
      ];
      usersService.findByRole.mockResolvedValue(employees as any);

      const result = await service.getSkillsAnalytics();

      expect(usersService.findByRole).toHaveBeenCalledWith('EMPLOYEE');
      expect(result.totalEmployees).toBe(3);
      expect(result.byDepartment).toHaveLength(2);
      expect(result.topSkills.length).toBeGreaterThanOrEqual(0);
    });

    it('returns empty analytics when no employees', async () => {
      usersService.findByRole.mockResolvedValue([] as any);

      const result = await service.getSkillsAnalytics();

      expect(result.totalEmployees).toBe(0);
      expect(result.avgGlobalScore).toBe(0);
      expect(result.coveragePercent).toBe(0);
    });

    it('counts employees with skills correctly', async () => {
      const employees = [
        makeUser({ savoir: [{ name: 'Python' }] }),
        makeUser({ _id: 'emp-2', savoir: [], savoir_faire: [], savoir_etre: [] }),
      ];
      usersService.findByRole.mockResolvedValue(employees as any);

      const result = await service.getSkillsAnalytics();
      expect(result.withSkills).toBe(1);
    });
  });

  // ── getAllEmployeeSkills ───────────────────────────────────────────────

  describe('getAllEmployeeSkills', () => {
    it('returns mapped employee skills list', async () => {
      const employees = [makeUser(), makeUser({ _id: 'emp-2', email: 'bob@x.com' })];
      usersService.findByRole.mockResolvedValue(employees as any);

      const result = await service.getAllEmployeeSkills();

      expect(usersService.findByRole).toHaveBeenCalledWith('EMPLOYEE');
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('email', 'alice@x.com');
      expect(result[0]).toHaveProperty('globalScore', 75);
    });

    it('uses firstName/lastName when available', async () => {
      usersService.findByRole.mockResolvedValue([makeUser()] as any);
      const result = await service.getAllEmployeeSkills();
      expect(result[0].name).toBe('Alice Smith');
    });

    it('falls back to name when firstName/lastName missing', async () => {
      usersService.findByRole.mockResolvedValue([
        makeUser({ firstName: undefined, lastName: undefined, name: 'Alice' }),
      ] as any);
      const result = await service.getAllEmployeeSkills();
      expect(result[0].name).toBe('Alice');
    });

    it('returns empty array when no employees', async () => {
      usersService.findByRole.mockResolvedValue([] as any);
      const result = await service.getAllEmployeeSkills();
      expect(result).toHaveLength(0);
    });
  });
});
