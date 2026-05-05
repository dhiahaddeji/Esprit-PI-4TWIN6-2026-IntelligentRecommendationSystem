import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service';
import { getModelToken } from '@nestjs/mongoose';
import { AuditLog, AuditAction } from './audit-log.schema';
import { NotificationsGateway } from '../notifications/notifications.gateway';

const makeLog = (overrides: any = {}) => ({
  _id: 'log-id-1',
  action: AuditAction.USER_LOGIN,
  userId: 'user-id-1',
  userName: 'Alice',
  userRole: 'EMPLOYEE',
  createdAt: new Date('2026-01-15T10:00:00Z'),
  toObject: jest.fn().mockReturnValue({ _id: 'log-id-1', action: 'USER_LOGIN' }),
  ...overrides,
});

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let auditLogModel: any;
  let gateway: jest.Mocked<NotificationsGateway>;

  beforeEach(async () => {
    auditLogModel = {
      create: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        { provide: getModelToken(AuditLog.name), useValue: auditLogModel },
        {
          provide: NotificationsGateway,
          useValue: { emitToRole: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
    gateway = module.get(NotificationsGateway);
    jest.clearAllMocks();
  });

  // ── log ───────────────────────────────────────────────────────────────

  describe('log', () => {
    it('creates an audit log entry', async () => {
      const entry = makeLog();
      auditLogModel.create.mockResolvedValue(entry);

      const result = await service.log({
        action: AuditAction.USER_LOGIN,
        userId: 'user-id-1',
        userName: 'Alice',
        userRole: 'EMPLOYEE',
      });

      expect(auditLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.USER_LOGIN, userId: 'user-id-1' }),
      );
      expect(result).toBe(entry);
    });

    it('emits audit_log event to SUPERADMIN via gateway', async () => {
      const entry = makeLog();
      auditLogModel.create.mockResolvedValue(entry);

      await service.log({ action: AuditAction.USER_LOGIN, userId: 'u1' });

      expect(gateway.emitToRole).toHaveBeenCalledWith('SUPERADMIN', 'audit_log', expect.any(Object));
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────

  describe('findAll', () => {
    function makeChain(logs: any[], total: number) {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(logs),
      };
      auditLogModel.find.mockReturnValue(chain);
      auditLogModel.countDocuments.mockResolvedValue(total);
    }

    it('returns paginated logs with total', async () => {
      const logs = [makeLog()];
      makeChain(logs, 1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result).toMatchObject({ logs, total: 1, page: 1, limit: 10 });
    });

    it('filters by action when provided', async () => {
      makeChain([], 0);
      await service.findAll({ action: 'USER_LOGIN' });
      expect(auditLogModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_LOGIN' }),
      );
    });

    it('filters by userId when provided', async () => {
      makeChain([], 0);
      await service.findAll({ userId: 'user-id-1' });
      expect(auditLogModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-id-1' }),
      );
    });

    it('applies dateFrom filter', async () => {
      makeChain([], 0);
      await service.findAll({ dateFrom: '2026-01-01' });
      expect(auditLogModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ createdAt: expect.objectContaining({ $gte: expect.any(Date) }) }),
      );
    });

    it('applies dateTo filter', async () => {
      makeChain([], 0);
      await service.findAll({ dateTo: '2026-01-31' });
      expect(auditLogModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ createdAt: expect.objectContaining({ $lte: expect.any(Date) }) }),
      );
    });

    it('caps limit at 200', async () => {
      makeChain([], 0);
      const result = await service.findAll({ limit: 9999 });
      expect(result.limit).toBe(200);
    });

    it('uses default page 1 and limit 50', async () => {
      makeChain([], 0);
      const result = await service.findAll({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });
  });

  // ── exportCsv ─────────────────────────────────────────────────────────

  describe('exportCsv', () => {
    it('returns a CSV string with header row', async () => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([makeLog()]),
      };
      auditLogModel.find.mockReturnValue(chain);

      const csv = await service.exportCsv({});
      expect(typeof csv).toBe('string');
      expect(csv).toContain('Date');
      expect(csv).toContain('Action');
    });

    it('escapes special characters in CSV', async () => {
      const log = makeLog({ userName: 'Alice "Test"', action: 'USER_LOGIN' });
      const chain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([log]),
      };
      auditLogModel.find.mockReturnValue(chain);

      const csv = await service.exportCsv({});
      expect(csv).toContain('""');
    });

    it('returns just header for empty log set', async () => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      auditLogModel.find.mockReturnValue(chain);

      const csv = await service.exportCsv({});
      const lines = csv.trim().split('\n');
      expect(lines).toHaveLength(1);
    });

    it('filters by action when provided', async () => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      auditLogModel.find.mockReturnValue(chain);
      await service.exportCsv({ action: 'USER_LOGIN' });
      expect(auditLogModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_LOGIN' }),
      );
    });
  });
});
