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
import { BadRequestException } from '@nestjs/common';

const makeActivity = (overrides: any = {}) => ({
  _id: 'act-id-1',
  title: 'Formation React',
  type: 'formation',
  status: 'AI_SUGGESTED',
  seats: 3,
  participants: [],
  competences_requises: [{ intitule: 'Python', niveau_min: 2 }],
  prioritization: 'expertise',
  startDate: '2026-06-01',
  endDate: '2026-06-05',
  managerId: 'mgr-1',
  ...overrides,
});

const makeEmployee = (overrides: any = {}) => ({
  employee_id: 'emp-1',
  employee_name: 'Alice',
  competences: [
    { intitule: 'Python', auto_eval: 3, hierarchie_eval: 3 },
  ],
  ...overrides,
});

const makeRec = (overrides: any = {}) => ({
  _id: 'rec-id-1',
  activityId: 'act-id-1',
  list: [
    { employeeId: 'emp-1', employeeName: 'Alice', score: 80 },
    { employeeId: 'emp-2', employeeName: 'Bob', score: 60 },
  ],
  refusedEmployees: [],
  validated: false,
  ...overrides,
});

describe('RecommendationsController (extra)', () => {
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
        { provide: RecommendationsService, useValue: { getByActivity: jest.fn(), upsert: jest.fn() } },
        { provide: ActivitiesService, useValue: { findById: jest.fn(), findAll: jest.fn(), update: jest.fn() } },
        { provide: CompetencesService, useValue: { getAllEmployeesCompetences: jest.fn() } },
        { provide: InvitationsService, useValue: {} },
        { provide: UsersService, useValue: { findByIds: jest.fn() } },
        { provide: NotificationsService, useValue: { create: jest.fn().mockResolvedValue(undefined) } },
        { provide: MlService, useValue: { recommend: jest.fn() } },
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

  // ── validate with busy employees ──────────────────────────────────────

  describe('validate - busy employees', () => {
    it('throws BadRequestException when selected employees are busy', async () => {
      const rec = makeRec();
      const activity = makeActivity({ startDate: '2026-06-01', endDate: '2026-06-05' });
      const conflictActivity = makeActivity({
        _id: 'act-conflict',
        startDate: '2026-06-02',
        endDate: '2026-06-04',
        participants: ['emp-1'],
      });

      recService.getByActivity.mockResolvedValue(rec as any);
      activitiesService.findById.mockResolvedValue(activity as any);
      activitiesService.findAll.mockResolvedValue([activity, conflictActivity] as any);
      usersService.findByIds.mockResolvedValue([]);

      await expect(controller.validate('act-id-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── validate with manager notification ───────────────────────────────

  describe('validate - sends manager notification', () => {
    it('notifies manager when managerId is set', async () => {
      const rec = makeRec();
      const activity = makeActivity({ managerId: 'mgr-1' });

      recService.getByActivity.mockResolvedValue(rec as any);
      activitiesService.findById.mockResolvedValue(activity as any);
      activitiesService.findAll.mockResolvedValue([activity] as any);
      usersService.findByIds.mockResolvedValue([]);
      activitiesService.update.mockResolvedValue({ ...activity, status: 'SENT_TO_MANAGER' } as any);
      recService.upsert.mockResolvedValue(rec as any);

      await controller.validate('act-id-1');

      expect(notifService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'mgr-1' }),
      );
    });

    it('skips manager notification when no managerId', async () => {
      const rec = makeRec();
      const activity = makeActivity({ managerId: undefined });

      recService.getByActivity.mockResolvedValue(rec as any);
      activitiesService.findById.mockResolvedValue(activity as any);
      activitiesService.findAll.mockResolvedValue([activity] as any);
      usersService.findByIds.mockResolvedValue([]);
      activitiesService.update.mockResolvedValue({ ...activity, status: 'SENT_TO_MANAGER' } as any);
      recService.upsert.mockResolvedValue(rec as any);

      await controller.validate('act-id-1');

      expect(notifService.create).not.toHaveBeenCalled();
    });
  });

  // ── runAI with certification type ─────────────────────────────────────

  describe('runAI - certification heuristic', () => {
    it('uses certification scoring when activity type is certification', async () => {
      const activity = makeActivity({
        type: 'certification',
        competences_requises: [{ intitule: 'Python', niveau_min: 3 }],
      });
      const employees = [
        makeEmployee({ employee_id: 'emp-1', competences: [] }),
        makeEmployee({ employee_id: 'emp-2', competences: [{ intitule: 'Python', auto_eval: 4, hierarchie_eval: 4 }] }),
      ];
      const rec = makeRec();

      activitiesService.findById.mockResolvedValue(activity as any);
      recService.getByActivity.mockResolvedValue({ refusedEmployees: [] } as any);
      compSvc.getAllEmployeesCompetences.mockResolvedValue(employees as any);
      mlService.recommend.mockResolvedValue(null as any);
      activitiesService.findAll.mockResolvedValue([activity] as any);
      usersService.findByIds.mockResolvedValue([]);
      activitiesService.update.mockResolvedValue(activity as any);
      recService.upsert.mockResolvedValue(rec as any);

      const result = await controller.runAI('act-id-1');
      expect(recService.upsert).toHaveBeenCalled();
      expect(result).toBe(rec);
    });
  });

  // ── runAI with no required competences ───────────────────────────────

  describe('runAI - no required competences', () => {
    it('handles activity with no required competences', async () => {
      const activity = makeActivity({ competences_requises: [] });
      const employees = [makeEmployee()];
      const rec = makeRec();

      activitiesService.findById.mockResolvedValue(activity as any);
      recService.getByActivity.mockResolvedValue({ refusedEmployees: [] } as any);
      compSvc.getAllEmployeesCompetences.mockResolvedValue(employees as any);
      mlService.recommend.mockResolvedValue(null as any);
      activitiesService.findAll.mockResolvedValue([activity] as any);
      usersService.findByIds.mockResolvedValue([]);
      activitiesService.update.mockResolvedValue(activity as any);
      recService.upsert.mockResolvedValue(rec as any);

      const result = await controller.runAI('act-id-1');
      expect(result).toBe(rec);
    });
  });

  // ── runAI with upskilling prioritization ─────────────────────────────

  describe('runAI - upskilling prioritization', () => {
    it('applies upskilling context weights', async () => {
      const activity = makeActivity({
        prioritization: 'upskilling',
        competences_requises: [{ intitule: 'Python', niveau_min: 2 }],
      });
      const employees = [makeEmployee()];
      const rec = makeRec();

      activitiesService.findById.mockResolvedValue(activity as any);
      recService.getByActivity.mockResolvedValue({ refusedEmployees: [] } as any);
      compSvc.getAllEmployeesCompetences.mockResolvedValue(employees as any);
      mlService.recommend.mockResolvedValue(null as any);
      activitiesService.findAll.mockResolvedValue([activity] as any);
      usersService.findByIds.mockResolvedValue([]);
      activitiesService.update.mockResolvedValue(activity as any);
      recService.upsert.mockResolvedValue(rec as any);

      const result = await controller.runAI('act-id-1');
      expect(result).toBe(rec);
    });
  });

  // ── runAI with partial skill match ────────────────────────────────────

  describe('runAI - partial skill matching', () => {
    it('matches skills using partial name matching', async () => {
      const activity = makeActivity({
        competences_requises: [{ intitule: 'Python programming', niveau_min: 2 }],
      });
      const employees = [
        makeEmployee({
          competences: [{ intitule: 'Python', auto_eval: 3, hierarchie_eval: 3 }],
        }),
      ];
      const rec = makeRec();

      activitiesService.findById.mockResolvedValue(activity as any);
      recService.getByActivity.mockResolvedValue({ refusedEmployees: [] } as any);
      compSvc.getAllEmployeesCompetences.mockResolvedValue(employees as any);
      mlService.recommend.mockResolvedValue(null as any);
      activitiesService.findAll.mockResolvedValue([activity] as any);
      usersService.findByIds.mockResolvedValue([]);
      activitiesService.update.mockResolvedValue(activity as any);
      recService.upsert.mockResolvedValue(rec as any);

      const result = await controller.runAI('act-id-1');
      expect(result).toBe(rec);
    });
  });
});
