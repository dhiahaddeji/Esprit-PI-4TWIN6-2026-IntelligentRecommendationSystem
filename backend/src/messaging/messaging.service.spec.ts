import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import { getModelToken } from '@nestjs/mongoose';
import { Conversation } from './conversation.schema';
import { Message } from './message.schema';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

const makeConv = (overrides: any = {}) => ({
  _id: 'conv-id-1',
  type: 'dm',
  participants: ['user-1', 'user-2'],
  unreadCounts: {},
  lastMessageAt: new Date(),
  ...overrides,
});

const makeMsg = (overrides: any = {}) => ({
  _id: 'msg-id-1',
  conversationId: 'conv-id-1',
  senderId: 'user-1',
  content: 'Hello',
  ...overrides,
});

const makeUser = (id: string, overrides: any = {}) => ({
  _id: id,
  name: `User ${id}`,
  email: `${id}@x.com`,
  role: 'EMPLOYEE',
  firstName: '',
  lastName: '',
  ...overrides,
});

describe('MessagingService', () => {
  let service: MessagingService;
  let convModel: any;
  let msgModel: any;
  let usersService: jest.Mocked<UsersService>;
  let notifSvc: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    convModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      create: jest.fn(),
    };
    msgModel = {
      find: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: getModelToken(Conversation.name), useValue: convModel },
        { provide: getModelToken(Message.name), useValue: msgModel },
        {
          provide: UsersService,
          useValue: { findAll: jest.fn(), findById: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { notifyNewMessage: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    usersService = module.get(UsersService);
    notifSvc = module.get(NotificationsService);
    jest.clearAllMocks();
  });

  // ── getContactableUsers ───────────────────────────────────────────────

  describe('getContactableUsers', () => {
    it('returns all users except the requester', async () => {
      usersService.findAll.mockResolvedValue([
        makeUser('user-1'),
        makeUser('user-2'),
        makeUser('user-3'),
      ] as any);

      const result = await service.getContactableUsers('user-1');

      expect(result).toHaveLength(2);
      expect(result.map((u: any) => u._id)).not.toContain('user-1');
    });

    it('returns empty when only requester exists', async () => {
      usersService.findAll.mockResolvedValue([makeUser('user-1')] as any);
      const result = await service.getContactableUsers('user-1');
      expect(result).toHaveLength(0);
    });
  });

  // ── getMyConversations ────────────────────────────────────────────────

  describe('getMyConversations', () => {
    it('returns conversations with unread count for user', async () => {
      const conv = makeConv({ unreadCounts: { 'user-1': 3 } });
      convModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([conv]) }),
      });

      const result = await service.getMyConversations('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].unread).toBe(3);
    });

    it('returns 0 unread when no unreadCounts entry', async () => {
      const conv = makeConv({ unreadCounts: {} });
      convModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([conv]) }),
      });

      const result = await service.getMyConversations('user-1');
      expect(result[0].unread).toBe(0);
    });
  });

  // ── createConversation ────────────────────────────────────────────────

  describe('createConversation', () => {
    it('throws BadRequestException for invalid type', async () => {
      await expect(
        service.createConversation('user-1', 'EMPLOYEE', 'invalid', 'Test', []),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when DM does not have exactly 2 participants', async () => {
      await expect(
        service.createConversation('user-1', 'EMPLOYEE', 'dm', '', ['user-2', 'user-3']),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns existing DM if already exists', async () => {
      const existing = makeConv({ type: 'dm' });
      convModel.findOne.mockResolvedValue(existing);

      const result = await service.createConversation('user-1', 'EMPLOYEE', 'dm', '', ['user-2']);
      expect(result).toBe(existing);
      expect(convModel.create).not.toHaveBeenCalled();
    });

    it('creates new DM when none exists', async () => {
      convModel.findOne.mockResolvedValue(null);
      const newConv = makeConv();
      convModel.create.mockResolvedValue(newConv);

      const result = await service.createConversation('user-1', 'EMPLOYEE', 'dm', '', ['user-2']);
      expect(result).toBe(newConv);
      expect(convModel.create).toHaveBeenCalled();
    });

    it('throws ForbiddenException when non-HR creates announcement', async () => {
      await expect(
        service.createConversation('user-1', 'EMPLOYEE', 'announcement', 'Notice', ['user-2']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows HR to create announcement', async () => {
      const newConv = makeConv({ type: 'announcement' });
      convModel.create.mockResolvedValue(newConv);

      const result = await service.createConversation('hr-1', 'HR', 'announcement', 'Notice', ['user-2']);
      expect(result).toBe(newConv);
    });

    it('creates group conversation', async () => {
      const newConv = makeConv({ type: 'group' });
      convModel.create.mockResolvedValue(newConv);

      const result = await service.createConversation('user-1', 'EMPLOYEE', 'group', 'Team Chat', ['user-2', 'user-3']);
      expect(result).toBe(newConv);
    });
  });
});
