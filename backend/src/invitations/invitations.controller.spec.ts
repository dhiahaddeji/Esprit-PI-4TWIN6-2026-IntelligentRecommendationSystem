import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { ActivitiesService } from '../activity/activity.service';
import { ParticipationsService } from '../participations/participations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

const makeInv = (overrides: any = {}) => ({
  _id: 'inv-id-1',
  activityId: 'act-id-1',
  employeeId: 'emp-id-1',
  status: 'PENDING',
  ...overrides,
});

const makeActivity = (overrides: any = {}) => ({
  _id: 'act-id-1',
  title: 'Formation React',
  participants: ['emp-id-1'],
  ...overrides,
});

const mockReq = (overrides: any = {}) => ({
  user: { userId: 'emp-id-1', name: 'Alice', role: 'EMPLOYEE', ...overrides },
});

describe('InvitationsController', () => {
  let controller: InvitationsController;
  let invService: jest.Mocked<InvitationsService>;
  let activitiesService: jest.Mocked<ActivitiesService>;
  let participationsService: jest.Mocked<ParticipationsService>;
  let notifSvc: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        {
          provide: InvitationsService,
          useValue: {
            bulkCreate: jest.fn(),
            listForEmployee: jest.fn(),
            findById: jest.fn(),
            respond: jest.fn(),
            listByActivity: jest.fn(),
          },
        },
        {
          provide: ActivitiesService,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: ParticipationsService,
          useValue: { upsert: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: NotificationsService,
          useValue: {
            notifyActivityInvitation: jest.fn().mockResolvedValue(undefined),
            notifyManagerActivityResponse: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InvitationsController>(InvitationsController);
    invService = module.get(InvitationsService);
    activitiesService = module.get(ActivitiesService);
    participationsService = module.get(ParticipationsService);
    notifSvc = module.get(NotificationsService);
    jest.clearAllMocks();
  });

  // ── notify ────────────────────────────────────────────────────────────

  describe('notify', () => {
    it('creates invitations and updates activity status', async () => {
      const activity = makeActivity();
      activitiesService.findById.mockResolvedValue(activity as any);
      invService.bulkCreate.mockResolvedValue([] as any);
      activitiesService.update.mockResolvedValue({ ...activity, status: 'NOTIFIED' } as any);

      const result = await controller.notify('act-id-1', { employeeIds: ['emp-1', 'emp-2'] });

      expect(invService.bulkCreate).toHaveBeenCalledWith('act-id-1', ['emp-1', 'emp-2']);
      expect(activitiesService.update).toHaveBeenCalledWith('act-id-1', { status: 'NOTIFIED' });
      expect(result).toEqual({ ok: true });
    });
  });

  // ── me ────────────────────────────────────────────────────────────────

  describe('me', () => {
    it('returns invitations for current employee', () => {
      const invitations = [makeInv()];
      invService.listForEmployee.mockReturnValue(invitations as any);

      const result = controller.me(mockReq() as any);
      expect(invService.listForEmployee).toHaveBeenCalledWith('emp-id-1');
      expect(result).toBe(invitations);
    });
  });

  // ── getById ───────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns invitation for employee who owns it', async () => {
      const inv = makeInv({ employeeId: 'emp-id-1' });
      invService.findById.mockResolvedValue(inv as any);

      const result = await controller.getById('inv-id-1', mockReq() as any);
      expect(result).toBe(inv);
    });

    it('throws error when employee tries to access another employee invitation', async () => {
      const inv = makeInv({ employeeId: 'other-emp' });
      invService.findById.mockResolvedValue(inv as any);

      await expect(
        controller.getById('inv-id-1', mockReq({ userId: 'emp-id-1' }) as any),
      ).rejects.toThrow('Forbidden');
    });

    it('returns invitation for HR/Manager regardless of ownership', async () => {
      const inv = makeInv({ employeeId: 'emp-id-1' });
      invService.findById.mockResolvedValue(inv as any);

      const result = await controller.getById('inv-id-1', mockReq({ role: 'HR' }) as any);
      expect(result).toBe(inv);
    });
  });

  // ── respond ───────────────────────────────────────────────────────────

  describe('respond', () => {
    it('accepts invitation and creates participation', async () => {
      const inv = makeInv({ employeeId: 'emp-id-1', activityId: 'act-id-1' });
      const updated = makeInv({ status: 'ACCEPTED' });
      const activity = makeActivity();

      invService.findById.mockResolvedValue(inv as any);
      invService.respond.mockResolvedValue(updated as any);
      activitiesService.findById.mockResolvedValue(activity as any);

      const result = await controller.respond(
        'inv-id-1',
        mockReq() as any,
        { decision: 'ACCEPTED' },
      );

      expect(invService.respond).toHaveBeenCalledWith('inv-id-1', 'ACCEPTED', undefined);
      expect(participationsService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ACCEPTED' }),
      );
      expect(result).toBe(updated);
    });

    it('declines invitation with justification', async () => {
      const inv = makeInv({ employeeId: 'emp-id-1', activityId: 'act-id-1' });
      const updated = makeInv({ status: 'DECLINED', justification: 'Busy' });
      const activity = makeActivity();

      invService.findById.mockResolvedValue(inv as any);
      invService.respond.mockResolvedValue(updated as any);
      activitiesService.findById.mockResolvedValue(activity as any);

      await controller.respond(
        'inv-id-1',
        mockReq() as any,
        { decision: 'DECLINED', justification: 'Busy' },
      );

      expect(invService.respond).toHaveBeenCalledWith('inv-id-1', 'DECLINED', 'Busy');
    });

    it('throws when invitation not found', async () => {
      invService.findById.mockResolvedValue(null);
      await expect(
        controller.respond('inv-id-1', mockReq() as any, { decision: 'ACCEPTED' }),
      ).rejects.toThrow('Invitation not found');
    });

    it('throws when employee is not the invitation owner', async () => {
      invService.findById.mockResolvedValue(makeInv({ employeeId: 'other-emp' }) as any);
      await expect(
        controller.respond('inv-id-1', mockReq() as any, { decision: 'ACCEPTED' }),
      ).rejects.toThrow('Forbidden');
    });
  });

  // ── byActivity ────────────────────────────────────────────────────────

  describe('byActivity', () => {
    it('returns invitations for given activity', () => {
      const invitations = [makeInv(), makeInv({ _id: 'inv-id-2', employeeId: 'emp-2' })];
      invService.listByActivity.mockReturnValue(invitations as any);

      const result = controller.byActivity('act-id-1');
      expect(invService.listByActivity).toHaveBeenCalledWith('act-id-1');
      expect(result).toBe(invitations);
    });
  });
});
