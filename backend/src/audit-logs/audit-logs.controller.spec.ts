import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let auditLogsService: jest.Mocked<AuditLogsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        {
          provide: AuditLogsService,
          useValue: {
            findAll: jest.fn(),
            exportCsv: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
    auditLogsService = module.get(AuditLogsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns audit logs without filters', async () => {
      const logs = [{ _id: 'log-1', action: 'USER_CREATED' }];
      auditLogsService.findAll.mockResolvedValue(logs as any);

      const result = await controller.findAll();
      expect(auditLogsService.findAll).toHaveBeenCalledWith({
        action: undefined,
        userId: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        limit: undefined,
        page: undefined,
      });
      expect(result).toBe(logs);
    });

    it('passes parsed limit and page to service', async () => {
      auditLogsService.findAll.mockResolvedValue([] as any);
      await controller.findAll('USER_CREATED', 'u1', '2026-01-01', '2026-12-31', '50', '2');
      expect(auditLogsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, page: 2 }),
      );
    });

    it('passes filters to service', async () => {
      auditLogsService.findAll.mockResolvedValue([] as any);
      await controller.findAll('USER_DELETED', 'admin-1');
      expect(auditLogsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_DELETED', userId: 'admin-1' }),
      );
    });
  });

  describe('exportCsv', () => {
    it('sets CSV headers and sends csv content', async () => {
      auditLogsService.exportCsv.mockResolvedValue('header\nrow1');
      const res: any = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportCsv(res, 'USER_CREATED');

      expect(auditLogsService.exportCsv).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_CREATED' }),
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('audit-logs-'),
      );
      expect(res.send).toHaveBeenCalled();
    });
  });
});
