import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { getModelToken } from '@nestjs/mongoose';
import { Notification } from './notification.schema';
import { UsersService } from '../users/users.service';
import { NotificationsGateway } from './notifications.gateway';

const makeNotif = (overrides: any = {}) => ({
  _id: 'notif-id-1',
  userId: 'user-id-1',
  type: 'skill_submitted',
  title: 'Test Notification',
  message: 'Test message',
  link: '',
  meta: {},
  read: false,
  toObject: jest.fn().mockReturnValue({ _id: 'notif-id-1', userId: 'user-id-1' }),
  ...overrides,
});

const makeUser = (overrides: any = {}) => ({
  _id: { toString: () => 'manager-id-1' },
  role: 'MANAGER',
  email: 'manager@example.com',
  name: 'Manager User',
  ...overrides,
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notifModel: any;
  let usersService: jest.Mocked<UsersService>;
  let gateway: jest.Mocked<NotificationsGateway>;

  beforeEach(async () => {
    notifModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(Notification.name),
          useValue: notifModel,
        },
        {
          provide: UsersService,
          useValue: {
            findByRole: jest.fn(),
          },
        },
        {
          provide: NotificationsGateway,
          useValue: {
            emitNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    usersService = module.get(UsersService);
    gateway = module.get(NotificationsGateway);
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates notification and emits via gateway', async () => {
      const notif = makeNotif();
      notifModel.create.mockResolvedValue(notif);

      const result = await service.create({
        userId: 'user-id-1',
        type: 'skill_submitted',
        title: 'Test',
        message: 'A message',
      });

      expect(notifModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id-1',
          type: 'skill_submitted',
          title: 'Test',
          message: 'A message',
          read: false,
        }),
      );
      expect(gateway.emitNotification).toHaveBeenCalledWith('user-id-1', notif.toObject());
      expect(result).toBe(notif);
    });

    it('does not throw if gateway.emitNotification fails', async () => {
      const notif = makeNotif();
      notifModel.create.mockResolvedValue(notif);
      gateway.emitNotification.mockImplementation(() => { throw new Error('socket error'); });

      await expect(
        service.create({ userId: 'user-id-1', type: 'skill_submitted', title: 'T', message: 'M' }),
      ).resolves.toBe(notif);
    });

    it('sets optional link and meta when provided', async () => {
      const notif = makeNotif({ link: '/dashboard', meta: { key: 'value' } });
      notifModel.create.mockResolvedValue(notif);

      await service.create({
        userId: 'user-id-1',
        type: 'skill_submitted',
        title: 'Test',
        message: 'Msg',
        link: '/dashboard',
        meta: { key: 'value' },
      });

      expect(notifModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ link: '/dashboard', meta: { key: 'value' } }),
      );
    });
  });

  // ── notifyManagersSkillSubmitted ──────────────────────────────────────

  describe('notifyManagersSkillSubmitted', () => {
    it('sends a notification to each manager', async () => {
      const managers = [
        makeUser({ _id: { toString: () => 'mgr-1' } }),
        makeUser({ _id: { toString: () => 'mgr-2' } }),
      ];
      usersService.findByRole.mockResolvedValue(managers as any);
      notifModel.create.mockImplementation(async (data: any) => makeNotif(data));

      await service.notifyManagersSkillSubmitted('emp-1', 'Alice', 'fiche-1');

      expect(usersService.findByRole).toHaveBeenCalledWith('MANAGER');
      expect(notifModel.create).toHaveBeenCalledTimes(2);
      expect(notifModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'skill_submitted',
          title: 'Fiche compétences à valider',
        }),
      );
    });

    it('does nothing when no managers exist', async () => {
      usersService.findByRole.mockResolvedValue([]);
      await service.notifyManagersSkillSubmitted('emp-1', 'Alice', 'fiche-1');
      expect(notifModel.create).not.toHaveBeenCalled();
    });
  });
});
