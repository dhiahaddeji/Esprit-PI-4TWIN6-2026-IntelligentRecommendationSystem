import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesController } from './activity.controller';
import { ActivitiesService } from './activity.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getModelToken } from '@nestjs/mongoose';
import { Recommendation } from '../recommendations/recommendation.schema';
import { Invitation } from '../invitations/invitation.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const makeActivity = (overrides: any = {}) => ({
  _id: 'act-id-1',
  title: 'Formation React',
  type: 'formation',
  status: 'DRAFT',
  participants: [],
  createdBy: 'hr-id-1',
  ...overrides,
});

const mockReq = (overrides: any = {}) => ({
  user: { userId: 'hr-id-1', name: 'HR User', role: 'HR', ...overrides },
});

describe('ActivitiesController', () => {
  let controller: ActivitiesController;
  let activitiesService: jest.Mocked<ActivitiesService>;
  let auditLogsService: jest.Mocked<AuditLogsService>;
  let notifService: jest.Mocked<NotificationsService>;
  let recModel: any;
  let invModel: any;

  beforeEach(async () => {
    recModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    invModel = {
      deleteMany: jest.fn().mockResolvedValue({}),
      insertMany: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        {
          provide: ActivitiesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            listPaginated: jest.fn(),
          },
        },
        {
          provide: AuditLogsService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: NotificationsService,
          useValue: {
            notifyActivityInvitation: jest.fn().mockResolvedValue(undefined),
            notifyHRActivityRefused: jest.fn().mockResolvedValue(undefined),
            notifyHRListRefused: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: getModelToken(Recommendation.name), useValue: recModel },
        { provide: getModelToken(Invitation.name), useValue: invModel },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ActivitiesController>(ActivitiesController);
    activitiesService = module.get(ActivitiesService);
    auditLogsService = module.get(AuditLogsService);
    notifService = module.get(NotificationsService);
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates activity and returns it', async () => {
      const activity = makeActivity();
      activitiesService.create.mockResolvedValue(activity as any);

      const body = { title: 'Formation React', type: 'formation', seats: '10' } as any;
      const result = await controller.create(body, mockReq() as any);

      expect(activitiesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Formation React',
          status: 'DRAFT',
          participants: [],
          createdBy: 'hr-id-1',
        }),
      );
      expect(result).toBe(activity);
    });

    it('normalizes startDate and endDate', async () => {
      activitiesService.create.mockResolvedValue(makeActivity() as any);
      const body = { title: 'T', type: 'formation', startDate: '2026-06-01', endDate: '2026-06-05' } as any;
      await controller.create(body, mockReq() as any);
      expect(activitiesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-05'),
        }),
      );
    });

    it('calls auditLogsService.log after creation', async () => {
      activitiesService.create.mockResolvedValue(makeActivity() as any);
      await controller.create({ title: 'T', type: 'formation' } as any, mockReq() as any);
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ACTIVITY_CREATED' }),
      );
    });
  });

  // ── list ──────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns all activities when no pagination', async () => {
      const activities = [makeActivity()];
      activitiesService.findAll.mockResolvedValue(activities as any);

      const result = await controller.list({} as any);
      expect(result).toBe(activities);
    });

    it('delegates to listPaginated when page/limit given', async () => {
      const paged = { data: [makeActivity()], total: 1, page: 1, limit: 10 };
      activitiesService.listPaginated.mockResolvedValue(paged as any);

      const result = await controller.list({ page: 1, limit: 10 } as any);
      expect(result).toBe(paged);
      expect(activitiesService.listPaginated).toHaveBeenCalledWith(1, 10);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns activity by id', async () => {
      const activity = makeActivity();
      activitiesService.findById.mockResolvedValue(activity as any);

      const result = await controller.get('act-id-1');
      expect(result).toBe(activity);
      expect(activitiesService.findById).toHaveBeenCalledWith('act-id-1');
    });
  });

  // ── confirm ───────────────────────────────────────────────────────────

  describe('confirm', () => {
    it('updates activity to MANAGER_CONFIRMED', async () => {
      const updated = makeActivity({ status: 'MANAGER_CONFIRMED', participants: ['emp-1'] });
      activitiesService.update.mockResolvedValue(updated as any);

      const body = { participants: ['emp-1'] } as any;
      const result = await controller.confirm('act-id-1', body, mockReq({ role: 'MANAGER' }) as any);

      expect(activitiesService.update).toHaveBeenCalledWith('act-id-1', {
        participants: ['emp-1'],
        status: 'MANAGER_CONFIRMED',
      });
      expect(result).toBe(updated);
    });

    it('uses empty array when no participants provided', async () => {
      activitiesService.update.mockResolvedValue(makeActivity() as any);
      await controller.confirm('act-id-1', {} as any, mockReq() as any);
      expect(activitiesService.update).toHaveBeenCalledWith(
        'act-id-1',
        expect.objectContaining({ participants: [] }),
      );
    });
  });

  // ── notified ──────────────────────────────────────────────────────────

  describe('notified', () => {
    it('sets status to NOTIFIED and creates invitations', async () => {
      const activity = makeActivity({ participants: ['emp-1', 'emp-2'] });
      activitiesService.findById.mockResolvedValue(activity as any);
      activitiesService.update.mockResolvedValue({ ...activity, status: 'NOTIFIED' } as any);

      await controller.notified('act-id-1', mockReq() as any);

      expect(activitiesService.update).toHaveBeenCalledWith('act-id-1', { status: 'NOTIFIED' });
      expect(invModel.deleteMany).toHaveBeenCalled();
      expect(invModel.insertMany).toHaveBeenCalled();
      expect(notifService.notifyActivityInvitation).toHaveBeenCalledTimes(2);
    });

    it('skips invitation creation when no participants', async () => {
      activitiesService.findById.mockResolvedValue(makeActivity({ participants: [] }) as any);
      activitiesService.update.mockResolvedValue(makeActivity({ status: 'NOTIFIED' }) as any);

      await controller.notified('act-id-1', mockReq() as any);
      expect(invModel.insertMany).not.toHaveBeenCalled();
    });
  });

  // ── refuse ────────────────────────────────────────────────────────────

  describe('refuse', () => {
    it('throws BadRequestException when no reason given', async () => {
      await expect(
        controller.refuse('act-id-1', { reason: '' }, mockReq() as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when activity not found', async () => {
      activitiesService.findById.mockResolvedValue(null);
      await expect(
        controller.refuse('act-id-1', { reason: 'Budget' }, mockReq() as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates activity to MANAGER_REFUSED and notifies HR', async () => {
      const activity = makeActivity({ createdBy: 'hr-id-1' });
      activitiesService.findById.mockResolvedValue(activity as any);
      activitiesService.update.mockResolvedValue({ ...activity, status: 'MANAGER_REFUSED' } as any);

      await controller.refuse('act-id-1', { reason: 'Budget insuffisant' }, mockReq() as any);

      expect(activitiesService.update).toHaveBeenCalledWith(
        'act-id-1',
        expect.objectContaining({ status: 'MANAGER_REFUSED', refusalReason: 'Budget insuffisant' }),
      );
      expect(notifService.notifyHRActivityRefused).toHaveBeenCalled();
    });
  });

  // ── refuseEmployees ───────────────────────────────────────────────────

  describe('refuseEmployees', () => {
    it('throws BadRequestException when no employees selected', async () => {
      await expect(
        controller.refuseEmployees('act-id-1', { employeeIds: [] }, mockReq() as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when activity not found', async () => {
      activitiesService.findById.mockResolvedValue(null);
      await expect(
        controller.refuseEmployees('act-id-1', { employeeIds: ['emp-1'] }, mockReq() as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates recommendation and activity status', async () => {
      const activity = makeActivity({ createdBy: 'hr-id-1' });
      activitiesService.findById.mockResolvedValue(activity as any);
      activitiesService.update.mockResolvedValue({ ...activity, status: 'HR_REGEN_NEEDED' } as any);
      recModel.findOne.mockResolvedValue({
        refusedEmployees: [],
        list: [{ employeeId: 'emp-1' }, { employeeId: 'emp-2' }],
      });
      recModel.findOneAndUpdate.mockResolvedValue({});

      await controller.refuseEmployees(
        'act-id-1',
        { employeeIds: ['emp-1'], employeeNames: ['Alice'] },
        mockReq() as any,
      );

      expect(activitiesService.update).toHaveBeenCalledWith(
        'act-id-1',
        expect.objectContaining({ status: 'HR_REGEN_NEEDED' }),
      );
      expect(notifService.notifyHRListRefused).toHaveBeenCalled();
    });
  });

  // ── setStatus ─────────────────────────────────────────────────────────

  describe('setStatus', () => {
    it('updates activity status', async () => {
      const updated = makeActivity({ status: 'COMPLETED' });
      activitiesService.update.mockResolvedValue(updated as any);

      const result = await controller.setStatus(
        'act-id-1',
        { status: 'COMPLETED' } as any,
        mockReq() as any,
      );

      expect(activitiesService.update).toHaveBeenCalledWith('act-id-1', { status: 'COMPLETED' });
      expect(result).toBe(updated);
    });
  });
});
