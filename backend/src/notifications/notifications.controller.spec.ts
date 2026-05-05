import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

const mockReq = (overrides: any = {}) => ({
  user: { userId: 'user-id-1', role: 'EMPLOYEE', ...overrides },
});

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let svc: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            getMyNotifications: jest.fn(),
            countUnread: jest.fn(),
            markRead: jest.fn(),
            markAllRead: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
    svc = module.get(NotificationsService);
    jest.clearAllMocks();
  });

  describe('getMyNotifications', () => {
    it('returns notifications for current user', () => {
      const notifications = [{ _id: 'n1', message: 'test' }];
      svc.getMyNotifications.mockReturnValue(notifications as any);

      const result = controller.getMyNotifications(mockReq() as any);
      expect(svc.getMyNotifications).toHaveBeenCalledWith('user-id-1');
      expect(result).toBe(notifications);
    });
  });

  describe('countUnread', () => {
    it('returns unread count for current user', () => {
      svc.countUnread.mockReturnValue(5 as any);
      const result = controller.countUnread(mockReq() as any);
      expect(svc.countUnread).toHaveBeenCalledWith('user-id-1');
      expect(result).toBe(5);
    });
  });

  describe('markRead', () => {
    it('marks a single notification as read', () => {
      svc.markRead.mockReturnValue({ ok: true } as any);
      const result = controller.markRead('n-id-1', mockReq() as any);
      expect(svc.markRead).toHaveBeenCalledWith('n-id-1', 'user-id-1');
      expect(result).toEqual({ ok: true });
    });
  });

  describe('markAllRead', () => {
    it('marks all notifications as read for current user', () => {
      svc.markAllRead.mockReturnValue({ ok: true } as any);
      const result = controller.markAllRead(mockReq() as any);
      expect(svc.markAllRead).toHaveBeenCalledWith('user-id-1');
      expect(result).toEqual({ ok: true });
    });
  });
});
