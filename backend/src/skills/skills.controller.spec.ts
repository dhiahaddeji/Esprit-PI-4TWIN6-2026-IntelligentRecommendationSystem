import { Test, TestingModule } from '@nestjs/testing';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

const makeRequest = (overrides: any = {}) => ({
  _id: 'req-id-1',
  employeeId: 'emp-id-1',
  employeeName: 'Alice',
  status: 'PENDING',
  ...overrides,
});

const mockReq = (overrides: any = {}) => ({
  user: { userId: 'emp-id-1', name: 'Alice', role: 'EMPLOYEE', firstName: 'Alice', lastName: 'Smith', ...overrides },
});

describe('SkillsController', () => {
  let controller: SkillsController;
  let skillsService: jest.Mocked<SkillsService>;
  let auditLogsService: jest.Mocked<AuditLogsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SkillsController],
      providers: [
        {
          provide: SkillsService,
          useValue: {
            getMySkills: jest.fn(),
            submitRequest: jest.fn(),
            getPending: jest.fn(),
            getAll: jest.fn(),
            getEmployeeSkills: jest.fn(),
            approve: jest.fn(),
            reject: jest.fn(),
            getSkillsAnalytics: jest.fn(),
            getAllEmployeeSkills: jest.fn(),
            postActivityEvaluation: jest.fn(),
          },
        },
        {
          provide: AuditLogsService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SkillsController>(SkillsController);
    skillsService = module.get(SkillsService);
    auditLogsService = module.get(AuditLogsService);
    jest.clearAllMocks();
  });

  // ── getMySkills ───────────────────────────────────────────────────────

  describe('getMySkills', () => {
    it('returns skills for current user', async () => {
      const skills = { approved: { savoir: [], globalScore: 0 }, pending: null };
      skillsService.getMySkills.mockResolvedValue(skills as any);

      const result = await controller.getMySkills(mockReq() as any);
      expect(skillsService.getMySkills).toHaveBeenCalledWith('emp-id-1');
      expect(result).toBe(skills);
    });
  });

  // ── submitRequest ─────────────────────────────────────────────────────

  describe('submitRequest', () => {
    it('submits skill request with user name from firstName/lastName', async () => {
      const req = makeRequest();
      skillsService.submitRequest.mockResolvedValue(req as any);

      const body = {
        savoir: [{ name: 'Python', level: 'HIGH', score: 75 }],
        savoir_faire: [],
        savoir_etre: [],
      };
      const result = await controller.submitRequest(mockReq() as any, body);

      expect(skillsService.submitRequest).toHaveBeenCalledWith(
        'emp-id-1', 'Alice Smith',
        body.savoir, body.savoir_faire, body.savoir_etre,
      );
      expect(result).toBe(req);
    });

    it('falls back to user.name when firstName/lastName missing', async () => {
      skillsService.submitRequest.mockResolvedValue(makeRequest() as any);
      const req = mockReq({ firstName: undefined, lastName: undefined, name: 'Alice' });
      await controller.submitRequest(req as any, { savoir: [], savoir_faire: [], savoir_etre: [] });
      expect(skillsService.submitRequest).toHaveBeenCalledWith(
        'emp-id-1', 'Alice', [], [], [],
      );
    });

    it('logs audit after submission', async () => {
      skillsService.submitRequest.mockResolvedValue(makeRequest() as any);
      await controller.submitRequest(
        mockReq() as any,
        { savoir: [{ name: 'Python' }], savoir_faire: [], savoir_etre: [] },
      );
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SKILL_SUBMITTED' }),
      );
    });
  });

  // ── getPending ────────────────────────────────────────────────────────

  describe('getPending', () => {
    it('returns pending skill requests', async () => {
      const requests = [makeRequest()];
      skillsService.getPending.mockResolvedValue(requests as any);

      const result = await controller.getPending();
      expect(result).toBe(requests);
    });
  });

  // ── getAll ────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns all skill requests', async () => {
      const requests = [makeRequest(), makeRequest({ _id: 'req-id-2', status: 'APPROVED' })];
      skillsService.getAll.mockResolvedValue(requests as any);

      const result = await controller.getAll();
      expect(result).toBe(requests);
    });
  });

  // ── getEmployeeSkills ─────────────────────────────────────────────────

  describe('getEmployeeSkills', () => {
    it('returns skills for given employee id', async () => {
      const skills = { savoir: [], globalScore: 0 };
      skillsService.getEmployeeSkills.mockResolvedValue(skills as any);

      const result = await controller.getEmployeeSkills('emp-id-1');
      expect(skillsService.getEmployeeSkills).toHaveBeenCalledWith('emp-id-1');
      expect(result).toBe(skills);
    });
  });

  // ── approve ───────────────────────────────────────────────────────────

  describe('approve', () => {
    it('approves request and logs audit', async () => {
      const req = makeRequest({ status: 'APPROVED' });
      skillsService.approve.mockResolvedValue(req as any);

      const result = await controller.approve(
        'req-id-1',
        mockReq({ userId: 'mgr-1', role: 'MANAGER' }) as any,
        { note: 'Well done' },
      );

      expect(skillsService.approve).toHaveBeenCalledWith('req-id-1', 'mgr-1', 'Well done');
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SKILL_APPROVED' }),
      );
      expect(result).toBe(req);
    });
  });

  // ── reject ────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('rejects request and logs audit', async () => {
      const req = makeRequest({ status: 'REJECTED' });
      skillsService.reject.mockResolvedValue(req as any);

      const result = await controller.reject(
        'req-id-1',
        mockReq({ userId: 'mgr-1', role: 'MANAGER' }) as any,
        { note: 'Insufficient evidence' },
      );

      expect(skillsService.reject).toHaveBeenCalledWith('req-id-1', 'mgr-1', 'Insufficient evidence');
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SKILL_REJECTED' }),
      );
      expect(result).toBe(req);
    });
  });

  // ── getAnalytics ──────────────────────────────────────────────────────

  describe('getAnalytics', () => {
    it('returns skills analytics', async () => {
      const analytics = { departments: [] };
      skillsService.getSkillsAnalytics.mockResolvedValue(analytics as any);

      const result = await controller.getAnalytics();
      expect(result).toBe(analytics);
    });
  });

  // ── getAllEmployeeSkills ───────────────────────────────────────────────

  describe('getAllEmployeeSkills', () => {
    it('returns all employee skills', async () => {
      const data = [{ employeeId: 'emp-1', skills: [] }];
      skillsService.getAllEmployeeSkills.mockResolvedValue(data as any);

      const result = await controller.getAllEmployeeSkills();
      expect(result).toBe(data);
    });
  });

  // ── postActivityEvaluation ────────────────────────────────────────────

  describe('postActivityEvaluation', () => {
    it('evaluates skills after activity', async () => {
      const updated = { savoir: [] };
      skillsService.postActivityEvaluation.mockResolvedValue(updated as any);

      const body = {
        employeeId: 'emp-1',
        skillUpdates: [{ skillName: 'Python', newLevel: 'HIGH' }],
      };
      const result = await controller.postActivityEvaluation(body);

      expect(skillsService.postActivityEvaluation).toHaveBeenCalledWith(
        'emp-1', body.skillUpdates,
      );
      expect(result).toBe(updated);
    });

    it('passes empty array when no skillUpdates', async () => {
      skillsService.postActivityEvaluation.mockResolvedValue({} as any);
      await controller.postActivityEvaluation({ employeeId: 'emp-1', skillUpdates: undefined as any });
      expect(skillsService.postActivityEvaluation).toHaveBeenCalledWith('emp-1', []);
    });
  });
});
