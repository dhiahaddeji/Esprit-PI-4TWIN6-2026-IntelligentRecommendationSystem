import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import { getModelToken } from '@nestjs/mongoose';
import { Conversation } from './conversation.schema';
import { Message } from './message.schema';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const makeConv = (overrides: any = {}) => ({
  _id: 'conv-id-1',
  type: 'dm',
  participants: ['user-1', 'user-2'],
  allowedSenders: [],
  unreadCounts: {},
  lastMessageAt: new Date(),
  save: jest.fn().mockResolvedValue(undefined),
  toObject: jest.fn().mockReturnValue({ _id: 'conv-id-1' }),
  ...overrides,
});

const makeMsg = (overrides: any = {}) => ({
  _id: 'msg-id-1',
  conversationId: 'conv-id-1',
  senderId: 'user-1',
  senderName: 'Alice',
  content: 'Hello',
  readBy: [],
  ...overrides,
});

describe('MessagingService — extended', () => {
  let service: MessagingService;
  let convModel: any;
  let msgModel: any;
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
      countDocuments: jest.fn(),
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
    notifSvc = module.get(NotificationsService);
    jest.clearAllMocks();
  });

  // ── getMessages ───────────────────────────────────────────────────────

  describe('getMessages', () => {
    it('throws NotFoundException when conversation not found', async () => {
      convModel.findById.mockResolvedValue(null);
      await expect(
        service.getMessages('user-1', 'conv-id-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user not participant', async () => {
      const conv = makeConv({ participants: ['user-2', 'user-3'] });
      convModel.findById.mockResolvedValue(conv);
      await expect(
        service.getMessages('user-1', 'conv-id-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns messages and total for conversation', async () => {
      const conv = makeConv({ participants: ['user-1', 'user-2'] });
      const messages = [makeMsg(), makeMsg({ _id: 'msg-id-2' })];
      convModel.findById.mockResolvedValue(conv);
      msgModel.countDocuments.mockResolvedValue(2);
      msgModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(messages),
          }),
        }),
      });

      const result = await service.getMessages('user-1', 'conv-id-1');
      expect(result.messages).toBe(messages);
      expect(result.total).toBe(2);
      expect(msgModel.find).toHaveBeenCalledWith({ conversationId: 'conv-id-1' });
    });
  });

  // ── sendMessage ───────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('throws NotFoundException when conversation not found', async () => {
      convModel.findById.mockResolvedValue(null);
      await expect(
        service.sendMessage('user-1', 'Alice', 'EMPLOYEE', 'conv-id-1', 'Hello'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when sender not participant', async () => {
      const conv = makeConv({ participants: ['user-2', 'user-3'] });
      convModel.findById.mockResolvedValue(conv);
      await expect(
        service.sendMessage('user-1', 'Alice', 'EMPLOYEE', 'conv-id-1', 'Hello'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates message and updates conversation', async () => {
      const conv = makeConv({ participants: ['user-1', 'user-2'], type: 'dm', allowedSenders: [] });
      const msg = makeMsg();
      convModel.findById.mockResolvedValue(conv);
      msgModel.create.mockResolvedValue(msg);
      convModel.findByIdAndUpdate.mockResolvedValue(conv);

      const result = await service.sendMessage('user-1', 'Alice', 'EMPLOYEE', 'conv-id-1', 'Hello');

      expect(msgModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-id-1',
          senderId: 'user-1',
          content: 'Hello',
        }),
      );
      expect(result).toBe(msg);
    });

    it('sends notification to other participants', async () => {
      const conv = makeConv({ participants: ['user-1', 'user-2'], type: 'dm', allowedSenders: [] });
      convModel.findById.mockResolvedValue(conv);
      msgModel.create.mockResolvedValue(makeMsg());
      convModel.findByIdAndUpdate.mockResolvedValue(conv);

      await service.sendMessage('user-1', 'Alice', 'EMPLOYEE', 'conv-id-1', 'Hello there');

      expect(notifSvc.notifyNewMessage).toHaveBeenCalledWith(
        'Alice', 'user-1', ['user-1', 'user-2'], 'conv-id-1', 'Hello there',
      );
    });
  });

  // ── markRead ──────────────────────────────────────────────────────────

  describe('markRead', () => {
    it('throws NotFoundException when conversation not found', async () => {
      convModel.findById.mockResolvedValue(null);
      await expect(service.markRead('user-1', 'conv-id-1')).rejects.toThrow(NotFoundException);
    });

    it('marks conversation as read for user', async () => {
      const conv = makeConv({ participants: ['user-1', 'user-2'] });
      convModel.findById.mockResolvedValue(conv);
      convModel.findByIdAndUpdate.mockResolvedValue(conv);

      const result = await service.markRead('user-1', 'conv-id-1');

      expect(convModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'conv-id-1',
        expect.objectContaining({ $set: expect.any(Object) }),
      );
      expect(result).toEqual({ ok: true });
    });
  });
});
