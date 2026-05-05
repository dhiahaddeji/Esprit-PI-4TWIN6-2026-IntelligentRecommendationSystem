import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import { getModelToken } from '@nestjs/mongoose';
import { Conversation } from './conversation.schema';
import { Message } from './message.schema';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

const makeConv = (overrides: any = {}) => ({
  _id: 'conv-id-1',
  type: 'dm',
  participants: ['user-1', 'user-2'],
  allowedSenders: [],
  unreadCounts: { 'user-2': 2 },
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('MessagingService — extra coverage', () => {
  let service: MessagingService;
  let convModel: any;

  beforeEach(async () => {
    convModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: getModelToken(Conversation.name), useValue: convModel },
        {
          provide: getModelToken(Message.name),
          useValue: { find: jest.fn(), create: jest.fn(), countDocuments: jest.fn() },
        },
        {
          provide: UsersService,
          useValue: { findAll: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { notifyNewMessage: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    jest.clearAllMocks();
  });

  // ── addAllowedSender ──────────────────────────────────────────────────

  describe('addAllowedSender', () => {
    it('throws ForbiddenException when requester is not HR/SUPERADMIN', async () => {
      await expect(
        service.addAllowedSender('u1', 'EMPLOYEE', 'conv-1', 'u2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when conversation not found', async () => {
      convModel.findById.mockResolvedValue(null);
      await expect(
        service.addAllowedSender('u1', 'HR', 'conv-1', 'u2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when conversation is not announcement type', async () => {
      convModel.findById.mockResolvedValue(makeConv({ type: 'dm' }));
      await expect(
        service.addAllowedSender('u1', 'HR', 'conv-1', 'u2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('adds sender to allowedSenders and saves', async () => {
      const conv = makeConv({ type: 'announcement', allowedSenders: ['user-1'] });
      convModel.findById.mockResolvedValue(conv);

      const result = await service.addAllowedSender('hr-1', 'HR', 'conv-id-1', 'user-3');

      expect(conv.allowedSenders).toContain('user-3');
      expect(conv.save).toHaveBeenCalled();
      expect(result).toBe(conv);
    });

    it('does not add duplicate sender', async () => {
      const conv = makeConv({ type: 'announcement', allowedSenders: ['user-1', 'user-3'] });
      convModel.findById.mockResolvedValue(conv);

      await service.addAllowedSender('hr-1', 'SUPERADMIN', 'conv-id-1', 'user-3');

      expect(conv.save).not.toHaveBeenCalled();
      expect(conv.allowedSenders).toHaveLength(2);
    });
  });

  // ── totalUnread ───────────────────────────────────────────────────────

  describe('totalUnread', () => {
    it('returns sum of unread counts across all conversations', async () => {
      const convs = [
        { unreadCounts: { 'user-1': 3 } },
        { unreadCounts: { 'user-1': 2 } },
        { unreadCounts: { 'user-2': 5 } },
      ];
      convModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(convs) });

      const result = await service.totalUnread('user-1');
      expect(result).toBe(5);
    });

    it('returns 0 when no conversations', async () => {
      convModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
      const result = await service.totalUnread('user-1');
      expect(result).toBe(0);
    });

    it('returns 0 when user has no unread in any conversation', async () => {
      const convs = [{ unreadCounts: { 'user-2': 5 } }];
      convModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(convs) });
      const result = await service.totalUnread('user-1');
      expect(result).toBe(0);
    });
  });
});
