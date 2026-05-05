import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsGateway } from './notifications.gateway';
import { JwtService } from '@nestjs/jwt';

const makeSocket = (overrides: any = {}): any => ({
  handshake: {
    auth: {},
    query: {},
    ...overrides.handshake,
  },
  data: {},
  disconnect: jest.fn(),
  join: jest.fn(),
  ...overrides,
});

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    jwtService = module.get(JwtService);
    jest.clearAllMocks();
  });

  // ── handleConnection ──────────────────────────────────────────────────

  describe('handleConnection', () => {
    it('disconnects client when no token provided', async () => {
      const client = makeSocket();
      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('joins user room when token is valid (from auth)', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', role: 'EMPLOYEE' });
      const client = makeSocket({ handshake: { auth: { token: 'valid-tok' }, query: {} } });

      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith('user:user-1');
      expect(client.join).toHaveBeenCalledWith('role:EMPLOYEE');
      expect(client.data.userId).toBe('user-1');
    });

    it('joins user room when token is in query params', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-2', role: 'MANAGER' });
      const client = makeSocket({ handshake: { auth: {}, query: { token: 'query-tok' } } });

      await gateway.handleConnection(client);
      expect(client.join).toHaveBeenCalledWith('user:user-2');
    });

    it('disconnects when jwt verify throws', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('Invalid token'); });
      const client = makeSocket({ handshake: { auth: { token: 'bad-tok' }, query: {} } });

      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('does not join role room when role is missing from payload', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-3' });
      const client = makeSocket({ handshake: { auth: { token: 'tok' }, query: {} } });

      await gateway.handleConnection(client);
      expect(client.join).toHaveBeenCalledWith('user:user-3');
      expect(client.join).toHaveBeenCalledTimes(1);
    });
  });

  // ── handleDisconnect ──────────────────────────────────────────────────

  describe('handleDisconnect', () => {
    it('handles disconnect without throwing', () => {
      const client = makeSocket();
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  // ── emitNotification ──────────────────────────────────────────────────

  describe('emitNotification', () => {
    it('emits notification to specific user room', () => {
      const mockRoom = { emit: jest.fn() };
      const mockTo = jest.fn().mockReturnValue(mockRoom);
      gateway.server = { to: mockTo } as any;

      gateway.emitNotification('user-1', { message: 'test' });

      expect(mockTo).toHaveBeenCalledWith('user:user-1');
      expect(mockRoom.emit).toHaveBeenCalledWith('notification', { message: 'test' });
    });

    it('does not throw when server is not ready', () => {
      gateway.server = undefined as any;
      expect(() => gateway.emitNotification('user-1', { msg: 'test' })).not.toThrow();
    });
  });

  // ── emitToRole ────────────────────────────────────────────────────────

  describe('emitToRole', () => {
    it('broadcasts event to all users of given role', () => {
      const mockRoom = { emit: jest.fn() };
      const mockTo = jest.fn().mockReturnValue(mockRoom);
      gateway.server = { to: mockTo } as any;

      gateway.emitToRole('HR', 'newActivity', { id: 'act-1' });

      expect(mockTo).toHaveBeenCalledWith('role:HR');
      expect(mockRoom.emit).toHaveBeenCalledWith('newActivity', { id: 'act-1' });
    });

    it('does not throw when server is not ready', () => {
      gateway.server = undefined as any;
      expect(() => gateway.emitToRole('HR', 'event', {})).not.toThrow();
    });
  });
});
