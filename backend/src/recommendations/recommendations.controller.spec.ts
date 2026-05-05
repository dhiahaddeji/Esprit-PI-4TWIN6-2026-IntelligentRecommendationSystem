import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { ActivitiesService } from '../activity/activity.service';
import { CompetencesService } from '../competences/competences.service';
import { InvitationsService } from '../invitations/invitations.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MlService } from './ml.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const makeActivity = (overrides: any = {}) => ({
  _id: 'act-id-1',
  title: 'Formation React',
  type: 'formation',
  status: 'AI_SUGGESTED',
  seats: 5,
  participants: [],
  competences_requises: [],
  prioritization: 'expertise',
  startDate: '2026-06-01',
  endDate: '2026-06-05',
  ...overrides,
});

const makeRec = (overrides: any = {}) => ({
  _id: 'rec-id-1',
  activityId: 'act-id-1',
  list: [{ employeeId: 'emp-1', employeeName: 'Alice', score: 80 }],
  refusedEmployees: [],
  validated: false,
  ...overrides,
});

const makeEmployee = (overrides: any = {}) => ({
  employee_id: 'emp-1',
  employee_name: 'Alice',
  competences: [{ intitule: 'Python', hierarchie_eval: 3, auto_eval: 3 }],
  ...overrides,
});

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let recService: jest.Mocked<RecommendationsService>;
  let activitiesService: jest.Mocked<ActivitiesService>;
  let compSvc: jest.Mocked<CompetencesService>;
  let usersService: jest.Mocked<UsersService>;
  let notifService: jest.Mocked<NotificationsService>;
  let mlService: jest.Mocked<MlService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        {
          provide: RecommendationsService,
          useValue: {
            getByActivity: jest.fn(),
            upsert: jest.fn(),
          },
        },
        {
          provide: ActivitiesService,
          useValue: {
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: CompetencesService,
          useValue: { getAllEmployeesCompetences: jest.fn() },
        },
        {
          provide: InvitationsService,
          useValue: {},
        },
        {
          provide: UsersService,
          useValue: { findByIds: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { create: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: MlService,
          useValue: { recommend: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
    recService = module.get(RecommendationsService);
    activitiesService = module.get(ActivitiesService);
    compSvc = module.get(CompetencesService);
    usersService = module.get(UsersService);
    notifService = module.get(NotificationsService);
    mlService = module.get(MlService);
    jest.clearAllMocks();
  });

  // ── get ───────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns recommendation for activity', async () => {
      const rec = makeRec();
      recService.getByActivity.mockResolvedValue(rec as any);

      const result = await controller.get('act-id-1');
      expect(recService.getByActivity).toHaveBeenCalledWith('act-id-1');
      expect(result).toBe(rec);
    });
  });

  // ── updateList ────────────────────────────────────────────────────────

  describe('updateList', () => {
    it('upserts the recommendation list', async () => {
      const rec = makeRec();
      recService.upsert.mockResolvedValue(rec as any);

      const list = [{ employeeId: 'emp-1', score: 80 }];
      const result = await controller.updateList('act-id-1', { list });

      expect(recService.upsert).toHaveBeenCalledWith('act-id-1', list, false);
      expect(result).toBe(rec);
    });

    it('passes empty list when body.list is undefined', async () => {
      recService.upsert.mockResolvedValue(makeRec() as any);
      await controller.updateList('act-id-1', {} as any);
      expect(recService.upsert).toHaveBeenCalledWith('act-id-1', [], false);
    });
  });

  // ── validate ──────────────────────────────────────────────────────────

  describe('validate', () => {
    it('throws BadRequestException when recommendation list is empty', async () => {
      recService.getByActivity.mockResolvedValue({ list: [] } as any);
      await expect(controller.validate('act-id-1')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when no recommendation exists', async () => {
      recService.getByActivity.mockResolvedValue(null as any);
      await expect(controller.validate('act-id-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when activity not found', async () => {
      recService.getByActivity.mockResolvedValue(makeRec() as any);
      activitiesService.findById.mockResolvedValue(null);
      await expect(controller.validate('act-id-1')).rejects.toThrow(NotFoundException);
    });

    it('validates recommendation and updates activity status', async () => {
      const rec = makeRec();
      const activity = makeActivity();
      recService.getByActivity.mockResolvedValue(rec as any);
      activitiesService.findById.mockResolvedValue(activity as any);
      activitiesService.findAll.mockResolvedValue([activity] as any);
      usersService.findByIds.mockResolvedValue([]);
      recService.upsert.mockResolvedValue(rec as any);
      activitiesService.update.mockResolvedValue({ ...activity, status: 'SENT_TO_MANAGER' } as any);

      await controller.validate('act-id-1');

      expect(activitiesService.update).toHaveBeenCalledWith(
        'act-id-1',
        expect.objectContaining({ status: 'SENT_TO_MANAGER' }),
      );
    });
  });

  // ── runAI ─────────────────────────────────────────────────────────────

  describe('runAI', () => {
    it('throws NotFoundException when activity not found', async () => {
      activitiesService.findById.mockResolvedValue(null);
      await expect(controller.runAI('act-id-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when no eligible employees', async () => {
      activitiesService.findById.mockResolvedValue(makeActivity() as any);
      recService.getByActivity.mockResolvedValue({ refusedEmployees: [] } as any);
      compSvc.getAllEmployeesCompetences.mockResolvedValue([] as any);

      await expect(controller.runAI('act-id-1')).rejects.toThrow(BadRequestException);
    });

    it('uses ML service results when available', async () => {
      const activity = makeActivity();
      const employee = makeEmployee();
      const mlResult = [{
        employee_id: 'emp-1', employee_name: 'Alice', score: 85,
        status: 'Selected', details: [], matched_skills: ['Python'],
        missing_skills: [], total_competences: 1, meets_all: true,
        meets_count: 1, explanation: 'Great fit',
      }];
      const rec = makeRec();

      activitiesService.findById.mockResolvedValue(activity as any);
      recService.getByActivity.mockResolvedValue({ refusedEmployees: [] } as any);
      compSvc.getAllEmployeesCompetences.mockResolvedValue([employee] as any);
      mlService.recommend.mockResolvedValue(mlResult as any);
      activitiesService.findAll.mockResolvedValue([activity] as any);
      usersService.findByIds.mockResolvedValue([]);
      activitiesService.update.mockResolvedValue({ ...activity, status: 'AI_SUGGESTED' } as any);
      recService.upsert.mockResolvedValue(rec as any);

      const result = await controller.runAI('act-id-1');

      expect(mlService.recommend).toHaveBeenCalled();
      expect(activitiesService.update).toHaveBeenCalledWith('act-id-1', { status: 'AI_SUGGESTED' });
      expect(result).toBe(rec);
    });

    it('falls back to heuristic when ML service returns empty', async () => {
      const activity = makeActivity({ competences_requises: [{ intitule: 'Python', niveau_min: 2 }] });
      const employee = makeEmployee();
      const rec = makeRec();

      activitiesService.findById.mockResolvedValue(activity as any);
      recService.getByActivity.mockResolvedValue({ refusedEmployees: [] } as any);
      compSvc.getAllEmployeesCompetences.mockResolvedValue([employee] as any);
      mlService.recommend.mockResolvedValue(null as any);
      activitiesService.findAll.mockResolvedValue([activity] as any);
      usersService.findByIds.mockResolvedValue([]);
      activitiesService.update.mockResolvedValue({ ...activity, status: 'AI_SUGGESTED' } as any);
      recService.upsert.mockResolvedValue(rec as any);

      const result = await controller.runAI('act-id-1');

      expect(recService.upsert).toHaveBeenCalled();
      expect(result).toBe(rec);
    });

    it('filters out refused employees', async () => {
      const activity = makeActivity();
      const employees = [makeEmployee(), makeEmployee({ employee_id: 'refused-emp' })];
      const rec = makeRec();

      activitiesService.findById.mockResolvedValue(activity as any);
      recService.getByActivity.mockResolvedValue({ refusedEmployees: ['refused-emp'] } as any);
      compSvc.getAllEmployeesCompetences.mockResolvedValue(employees as any);
      mlService.recommend.mockResolvedValue([{
        employee_id: 'emp-1', employee_name: 'Alice', score: 80,
        status: 'Selected', details: [], matched_skills: [],
        missing_skills: [], total_competences: 1, meets_all: false,
        meets_count: 0, explanation: '',
      }] as any);
      activitiesService.findAll.mockResolvedValue([activity] as any);
      usersService.findByIds.mockResolvedValue([]);
      activitiesService.update.mockResolvedValue(activity as any);
      recService.upsert.mockResolvedValue(rec as any);

      await controller.runAI('act-id-1');

      const employeesPassedToMl = mlService.recommend.mock.calls[0][0];
      expect(employeesPassedToMl).toHaveLength(1);
      expect(employeesPassedToMl[0].employee_id).toBe('emp-1');
    });
  });
});
