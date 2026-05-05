import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminController } from './superadmin.controller';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BadRequestException } from '@nestjs/common';

const mockReq = (overrides: any = {}) => ({
  user: { userId: 'admin-1', name: 'Admin', role: 'SUPERADMIN', ...overrides },
});

const makeUser = (overrides: any = {}) => ({
  _id: 'user-id-1',
  name: 'Alice',
  email: 'alice@x.com',
  role: 'EMPLOYEE',
  matricule: 'EMP001',
  status: 'ACTIVE',
  ...overrides,
});

/** Build a minimal in-memory CSV file mock */
const makeCsvFile = (content: string) => ({
  buffer: Buffer.from(content),
  mimetype: 'text/csv',
  originalname: 'users.csv',
});

describe('SuperAdminController (extra)', () => {
  let controller: SuperAdminController;
  let usersService: jest.Mocked<UsersService>;
  let mailService: jest.Mocked<MailService>;
  let auditLogsService: jest.Mocked<AuditLogsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuperAdminController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            listPaginated: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findByMatricule: jest.fn(),
            nextMatricule: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendWelcomeWithCredentials: jest.fn().mockResolvedValue(undefined),
            sendAccountSuspendedEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuditLogsService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SuperAdminController>(SuperAdminController);
    usersService = module.get(UsersService);
    mailService = module.get(MailService);
    auditLogsService = module.get(AuditLogsService);
    jest.clearAllMocks();
  });

  // ── uploadCsv ─────────────────────────────────────────────────────────

  describe('uploadCsv', () => {
    it('throws BadRequestException when no file', async () => {
      await expect(controller.uploadCsv(null as any, mockReq() as any)).rejects.toThrow(BadRequestException);
    });

    it('processes valid CSV and creates users', async () => {
      const csv = 'name,email,role\nAlice,alice@test.com,EMPLOYEE\n';
      usersService.findByEmail.mockResolvedValue(null);
      usersService.nextMatricule.mockResolvedValue('EMP001');
      usersService.create.mockResolvedValue(makeUser({ email: 'alice@test.com' }) as any);

      const result = await controller.uploadCsv(makeCsvFile(csv) as any, mockReq() as any);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('skips rows with missing fields', async () => {
      const csv = 'name,email,role\n,alice@test.com,EMPLOYEE\n';
      const result = await controller.uploadCsv(makeCsvFile(csv) as any, mockReq() as any);

      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('missing fields');
    });

    it('skips rows with invalid role', async () => {
      const csv = 'name,email,role\nAlice,alice@test.com,INVALID_ROLE\n';
      const result = await controller.uploadCsv(makeCsvFile(csv) as any, mockReq() as any);

      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Invalid role');
    });

    it('skips rows with invalid email format', async () => {
      const csv = 'name,email,role\nAlice,not-an-email,EMPLOYEE\n';
      const result = await controller.uploadCsv(makeCsvFile(csv) as any, mockReq() as any);

      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Invalid email');
    });

    it('skips rows with duplicate email', async () => {
      const csv = 'name,email,role\nAlice,alice@test.com,EMPLOYEE\n';
      usersService.findByEmail.mockResolvedValue(makeUser() as any);

      const result = await controller.uploadCsv(makeCsvFile(csv) as any, mockReq() as any);

      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('already exists');
    });

    it('handles create error gracefully', async () => {
      const csv = 'name,email,role\nAlice,alice@test.com,EMPLOYEE\n';
      usersService.findByEmail.mockResolvedValue(null);
      usersService.nextMatricule.mockResolvedValue('EMP001');
      usersService.create.mockRejectedValue(new Error('DB error'));

      const result = await controller.uploadCsv(makeCsvFile(csv) as any, mockReq() as any);

      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('DB error');
    });

    it('throws BadRequestException for empty CSV', async () => {
      const csv = 'name,email,role\n';
      await expect(controller.uploadCsv(makeCsvFile(csv) as any, mockReq() as any)).rejects.toThrow(BadRequestException);
    });

    it('processes multiple rows with mixed results', async () => {
      const csv = 'name,email,role\nAlice,alice@test.com,EMPLOYEE\nBob,bob@test.com,MANAGER\n';
      usersService.findByEmail.mockResolvedValue(null);
      usersService.nextMatricule.mockResolvedValue('EMP001');
      usersService.create
        .mockResolvedValueOnce(makeUser({ email: 'alice@test.com' }) as any)
        .mockResolvedValueOnce(makeUser({ email: 'bob@test.com', role: 'MANAGER' }) as any);

      const result = await controller.uploadCsv(makeCsvFile(csv) as any, mockReq() as any);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('includes date_embauche when provided in CSV', async () => {
      const csv = 'name,email,role,date_embauche\nAlice,alice@test.com,EMPLOYEE,2024-01-15\n';
      usersService.findByEmail.mockResolvedValue(null);
      usersService.nextMatricule.mockResolvedValue('EMP001');
      usersService.create.mockResolvedValue(makeUser() as any);

      const result = await controller.uploadCsv(makeCsvFile(csv) as any, mockReq() as any);

      expect(result.success).toBe(1);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ date_embauche: '2024-01-15' }),
      );
    });
  });
});
