import { Test, TestingModule } from '@nestjs/testing';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

const mockReq = (overrides: any = {}) => ({
  user: { userId: 'user-id-1', name: 'Alice', role: 'EMPLOYEE', email: 'alice@x.com', ...overrides },
});

describe('MessagingController', () => {
  let controller: MessagingController;
  let svc: jest.Mocked<MessagingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagingController],
      providers: [
        {
          provide: MessagingService,
          useValue: {
            getContactableUsers: jest.fn(),
            getMyConversations: jest.fn(),
            createConversation: jest.fn(),
            getMessages: jest.fn(),
            sendMessage: jest.fn(),
            markRead: jest.fn(),
            totalUnread: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MessagingController>(MessagingController);
    svc = module.get(MessagingService);
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('returns contactable users for current user', () => {
      const users = [{ _id: 'u2', name: 'Bob', role: 'MANAGER' }];
      svc.getContactableUsers.mockReturnValue(users as any);

      const result = controller.getUsers(mockReq() as any);
      expect(svc.getContactableUsers).toHaveBeenCalledWith('user-id-1');
      expect(result).toBe(users);
    });
  });

  describe('getMyConversations', () => {
    it('returns conversations for current user', () => {
      const convs = [{ _id: 'conv-1', type: 'dm' }];
      svc.getMyConversations.mockReturnValue(convs as any);

      const result = controller.getMyConversations(mockReq() as any);
      expect(svc.getMyConversations).toHaveBeenCalledWith('user-id-1');
      expect(result).toBe(convs);
    });
  });

  describe('createConversation', () => {
    it('creates a DM conversation', () => {
      const conv = { _id: 'conv-1', type: 'dm' };
      svc.createConversation.mockReturnValue(conv as any);

      const result = controller.createConversation(
        mockReq() as any,
        { type: 'dm', participants: ['user-2'] },
      );

      expect(svc.createConversation).toHaveBeenCalledWith(
        'user-id-1', 'EMPLOYEE', 'dm', '', ['user-2'],
      );
      expect(result).toBe(conv);
    });

    it('passes name when provided', () => {
      svc.createConversation.mockReturnValue({} as any);
      controller.createConversation(
        mockReq() as any,
        { type: 'group', name: 'Dev Team', participants: ['user-2', 'user-3'] },
      );
      expect(svc.createConversation).toHaveBeenCalledWith(
        'user-id-1', 'EMPLOYEE', 'group', 'Dev Team', ['user-2', 'user-3'],
      );
    });
  });

  describe('getMessages', () => {
    it('returns messages with default limit and offset', () => {
      const result_data = { messages: [], total: 0 };
      svc.getMessages.mockReturnValue(result_data as any);

      const result = controller.getMessages(mockReq() as any, 'conv-id-1');

      expect(svc.getMessages).toHaveBeenCalledWith('user-id-1', 'conv-id-1', 50, 0);
      expect(result).toBe(result_data);
    });

    it('passes parsed limit and offset from query params', () => {
      svc.getMessages.mockReturnValue({ messages: [], total: 0 } as any);
      controller.getMessages(mockReq() as any, 'conv-id-1', '20', '40');
      expect(svc.getMessages).toHaveBeenCalledWith('user-id-1', 'conv-id-1', 20, 40);
    });
  });

  describe('sendMessage', () => {
    it('sends message using user info from request', () => {
      const msg = { _id: 'msg-1', content: 'Hello' };
      svc.sendMessage.mockReturnValue(msg as any);

      const result = controller.sendMessage(
        mockReq() as any,
        'conv-id-1',
        { content: 'Hello' },
      );

      expect(svc.sendMessage).toHaveBeenCalledWith(
        'user-id-1', 'Alice', 'EMPLOYEE', 'conv-id-1', 'Hello',
      );
      expect(result).toBe(msg);
    });

    it('uses email when name is missing', () => {
      svc.sendMessage.mockReturnValue({} as any);
      controller.sendMessage(
        mockReq({ name: undefined }) as any,
        'conv-id-1',
        { content: 'Hi' },
      );
      expect(svc.sendMessage).toHaveBeenCalledWith(
        'user-id-1', 'alice@x.com', 'EMPLOYEE', 'conv-id-1', 'Hi',
      );
    });
  });

  describe('markRead', () => {
    it('marks conversation as read for current user', () => {
      svc.markRead.mockReturnValue({ ok: true } as any);
      const result = controller.markRead(mockReq() as any, 'conv-id-1');
      expect(svc.markRead).toHaveBeenCalledWith('user-id-1', 'conv-id-1');
      expect(result).toEqual({ ok: true });
    });
  });

  describe('totalUnread', () => {
    it('returns total unread count wrapped in object', async () => {
      svc.totalUnread.mockResolvedValue(3);
      const result = await controller.totalUnread(mockReq() as any);
      expect(svc.totalUnread).toHaveBeenCalledWith('user-id-1');
      expect(result).toEqual({ count: 3 });
    });
  });
});
