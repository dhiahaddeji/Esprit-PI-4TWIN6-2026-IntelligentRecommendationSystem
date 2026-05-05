import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { getModelToken } from '@nestjs/mongoose';
import { Notification } from './notification.schema';
import { UsersService } from '../users/users.service';
import { NotificationsGateway } from './notifications.gateway';

const makeNotif = (overrides: any = {}) => ({
  _id: 'notif-id-1',
  userId: 'user-id-1',
  type: 'activity_invitation',
  title: 'Test',
  message: 'Msg',
  link: '',
  meta: {},
  read: false,
  toObject: jest.fn().mockReturnValue({ _id: 'notif-id-1' }),
  ...overrides,
});

const makeManager = (id = 'mgr-1') => ({
  _id: { toString: () => id },
  role: 'MANAGER',
  email: `${id}@x.com`,
});

describe('NotificationsService — extended', () => {
  let service: NotificationsService;
  let notifModel: any;
  let usersService: jest.Mocked<UsersService>;
  let gateway: jest.Mocked<NotificationsGateway>;

  beforeEach(async () => {
    notifModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateMany: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getModelToken(Notification.name), useValue: notifModel },
        {
          provide: UsersService,
          useValue: { findByRole: jest.fn() },
        },
        {
          provide: NotificationsGateway,
          useValue: { emitNotification: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    usersService = module.get(UsersService);
    gateway = module.get(NotificationsGateway);
    jest.clearAllMocks();
  });

  // ── notifyEmployeeValidated ───────────────────────────────────────────

  describe('notifyEmployeeValidated', () => {
    it('creates a skill_validated notification for the employee', async () => {
      const notif = makeNotif({ type: 'skill_validated' });
      notifModel.create.mockResolvedValue(notif);

      await service.notifyEmployeeValidated('emp-1', 'Alice', 'fiche-1', 'mgr-1');

      expect(notifModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'skill_validated', userId: 'emp-1' }),
      );
    });
  });

  // ── notifyEmployeeRejected ────────────────────────────────────────────

  describe('notifyEmployeeRejected', () => {
    it('creates a skill_rejected notification with note in message', async () => {
      const notif = makeNotif({ type: 'skill_rejected' });
      notifModel.create.mockResolvedValue(notif);

      await service.notifyEmployeeRejected('emp-1', 'Alice', 'fiche-1', 'mgr-1', 'Incomplete');

      expect(notifModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'skill_rejected',
          userId: 'emp-1',
          message: expect.stringContaining('Incomplete'),
        }),
      );
    });

    it('creates notification without note when no reason given', async () => {
      notifModel.create.mockResolvedValue(makeNotif());
      await service.notifyEmployeeRejected('emp-1', 'Alice', 'fiche-1', 'mgr-1', '');
      expect(notifModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'skill_rejected' }),
      );
    });
  });

  // ── notifyNewMessage ──────────────────────────────────────────────────

  describe('notifyNewMessage', () => {
    it('notifies all participants except the sender', async () => {
      notifModel.create.mockImplementation(async (d: any) => makeNotif(d));

      await service.notifyNewMessage('Bob', 'sender-1', ['sender-1', 'recv-1', 'recv-2'], 'conv-1', 'Hello!');

      expect(notifModel.create).toHaveBeenCalledTimes(2);
      const calls = notifModel.create.mock.calls.map((c: any[]) => c[0].userId);
      expect(calls).not.toContain('sender-1');
      expect(calls).toContain('recv-1');
      expect(calls).toContain('recv-2');
    });

    it('truncates preview to 80 chars + ellipsis', async () => {
      notifModel.create.mockImplementation(async (d: any) => makeNotif(d));
      const longPreview = 'A'.repeat(120);

      await service.notifyNewMessage('Bob', 'sender', ['receiver'], 'conv-1', longPreview);

      const call = notifModel.create.mock.calls[0][0];
      expect(call.message).toHaveLength(81);
      expect(call.message.endsWith('…')).toBe(true);
    });

    it('does not truncate short messages', async () => {
      notifModel.create.mockImplementation(async (d: any) => makeNotif(d));
      await service.notifyNewMessage('Bob', 'sender', ['receiver'], 'conv-1', 'Hi');
      const call = notifModel.create.mock.calls[0][0];
      expect(call.message).toBe('Hi');
    });
  });

  // ── notifyActivityInvitation ──────────────────────────────────────────

  describe('notifyActivityInvitation', () => {
    it('creates activity_invitation notification', async () => {
      notifModel.create.mockResolvedValue(makeNotif());
      await service.notifyActivityInvitation('emp-1', 'Formation React', 'act-1');
      expect(notifModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'activity_invitation', userId: 'emp-1' }),
      );
    });
  });

  // ── notifyManagerActivityResponse ─────────────────────────────────────

  describe('notifyManagerActivityResponse', () => {
    it('notifies all managers on ACCEPTED response', async () => {
      usersService.findByRole.mockResolvedValue([makeManager('mgr-1'), makeManager('mgr-2')] as any);
      notifModel.create.mockImplementation(async (d: any) => makeNotif(d));

      await service.notifyManagerActivityResponse('emp-1', 'Alice', 'Formation', 'act-1', 'ACCEPTED');

      expect(notifModel.create).toHaveBeenCalledTimes(2);
      expect(notifModel.create.mock.calls[0][0].message).toContain('accepté');
    });

    it('uses "décliné" label for DECLINED status', async () => {
      usersService.findByRole.mockResolvedValue([makeManager()] as any);
      notifModel.create.mockImplementation(async (d: any) => makeNotif(d));

      await service.notifyManagerActivityResponse('emp-1', 'Alice', 'Formation', 'act-1', 'DECLINED');

      expect(notifModel.create.mock.calls[0][0].message).toContain('décliné');
    });
  });

  // ── notifyHRActivityRefused ───────────────────────────────────────────

  describe('notifyHRActivityRefused', () => {
    it('creates activity_refused notification for HR', async () => {
      notifModel.create.mockResolvedValue(makeNotif());
      await service.notifyHRActivityRefused('hr-1', 'Formation', 'act-1', 'Pas de budget', 'Bob Manager');
      expect(notifModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'activity_refused', userId: 'hr-1' }),
      );
    });
  });

  // ── notifyHRListRefused ───────────────────────────────────────────────

  describe('notifyHRListRefused', () => {
    it('creates list_refused notification with truncated names', async () => {
      notifModel.create.mockResolvedValue(makeNotif());
      await service.notifyHRListRefused('hr-1', 'Formation', 'act-1', 5, ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'], 'Manager');
      const call = notifModel.create.mock.calls[0][0];
      expect(call.type).toBe('list_refused');
      expect(call.message).toContain('+2 autres');
    });

    it('lists all names when 3 or fewer refused', async () => {
      notifModel.create.mockResolvedValue(makeNotif());
      await service.notifyHRListRefused('hr-1', 'Formation', 'act-1', 2, ['Alice', 'Bob'], 'Manager');
      const call = notifModel.create.mock.calls[0][0];
      expect(call.message).not.toContain('autres');
    });
  });

  // ── getMyNotifications ────────────────────────────────────────────────

  describe('getMyNotifications', () => {
    it('returns items with unread count', async () => {
      const items = [makeNotif({ read: false }), makeNotif({ read: true })];
      notifModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(items) }),
      });

      const result = await service.getMyNotifications('user-id-1');
      expect(result.items).toBe(items);
      expect(result.unread).toBe(1);
    });

    it('returns zero unread when all read', async () => {
      const items = [makeNotif({ read: true }), makeNotif({ read: true })];
      notifModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(items) }),
      });

      const result = await service.getMyNotifications('user-id-1');
      expect(result.unread).toBe(0);
    });
  });

  // ── countUnread ───────────────────────────────────────────────────────

  describe('countUnread', () => {
    it('returns count of unread notifications', async () => {
      notifModel.countDocuments.mockResolvedValue(5);
      const result = await service.countUnread('user-id-1');
      expect(result).toEqual({ count: 5 });
      expect(notifModel.countDocuments).toHaveBeenCalledWith({
        userId: 'user-id-1',
        read: false,
      });
    });
  });

  // ── markRead ──────────────────────────────────────────────────────────

  describe('markRead', () => {
    it('marks notification as read and returns updated unread count', async () => {
      notifModel.findOneAndUpdate.mockResolvedValue(makeNotif({ read: true }));
      notifModel.countDocuments.mockResolvedValue(3);

      const result = await service.markRead('notif-id-1', 'user-id-1');
      expect(notifModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'notif-id-1', userId: 'user-id-1' },
        { read: true },
      );
      expect(result).toEqual({ count: 3 });
    });
  });

  // ── markAllRead ───────────────────────────────────────────────────────

  describe('markAllRead', () => {
    it('marks all user notifications as read', async () => {
      notifModel.updateMany.mockResolvedValue({ modifiedCount: 4 });

      const result = await service.markAllRead('user-id-1');
      expect(notifModel.updateMany).toHaveBeenCalledWith(
        { userId: 'user-id-1', read: false },
        { read: true },
      );
      expect(result).toEqual({ count: 0 });
    });
  });
});
