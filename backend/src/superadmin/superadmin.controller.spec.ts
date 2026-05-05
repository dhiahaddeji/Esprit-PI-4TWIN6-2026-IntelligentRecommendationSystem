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

describe('SuperAdminController', () => {
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

  // ── getAllUsers ───────────────────────────────────────────────────────

  describe('getAllUsers', () => {
    it('returns all users when no pagination params', async () => {
      const users = [makeUser()];
      usersService.findAll.mockResolvedValue(users as any);

      const result = await controller.getAllUsers();
      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toBe(users);
    });

    it('delegates to listPaginated when page/limit given', async () => {
      const paged = { data: [makeUser()], total: 1, page: 1, limit: 20 };
      usersService.listPaginated.mockResolvedValue(paged as any);

      const result = await controller.getAllUsers('1', '20');
      expect(usersService.listPaginated).toHaveBeenCalledWith({}, 1, 20);
      expect(result).toBe(paged);
    });
  });

  // ── getUserById ───────────────────────────────────────────────────────

  describe('getUserById', () => {
    it('returns user by id', async () => {
      const user = makeUser();
      usersService.findById.mockResolvedValue(user as any);

      const result = await controller.getUserById('user-id-1');
      expect(usersService.findById).toHaveBeenCalledWith('user-id-1');
      expect(result).toBe(user);
    });
  });

  // ── createUser ────────────────────────────────────────────────────────

  describe('createUser', () => {
    it('creates user, sends welcome email, and returns result', async () => {
      const user = makeUser();
      usersService.nextMatricule.mockResolvedValue('EMP001');
      usersService.create.mockResolvedValue(user as any);

      const body = { name: 'Alice', email: 'alice@x.com', role: 'EMPLOYEE' };
      const result = await controller.createUser(body, mockReq() as any);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Alice', email: 'alice@x.com', role: 'EMPLOYEE' }),
      );
      expect(mailService.sendWelcomeWithCredentials).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('email', 'alice@x.com');
    });
  });

  // ── updateUser ────────────────────────────────────────────────────────

  describe('updateUser', () => {
    it('updates user and logs audit', async () => {
      const updated = makeUser({ name: 'Alice Updated' });
      usersService.update.mockResolvedValue(updated as any);

      const result = await controller.updateUser('user-id-1', { name: 'Alice Updated' }, mockReq() as any);

      expect(usersService.update).toHaveBeenCalledWith('user-id-1', { name: 'Alice Updated' });
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_UPDATED' }),
      );
      expect(result).toBe(updated);
    });
  });

  // ── deleteUser ────────────────────────────────────────────────────────

  describe('deleteUser', () => {
    it('deletes user and logs audit', async () => {
      const user = makeUser();
      usersService.findById.mockResolvedValue(user as any);
      usersService.delete.mockResolvedValue({ deleted: true } as any);

      const result = await controller.deleteUser('user-id-1', mockReq() as any);

      expect(usersService.delete).toHaveBeenCalledWith('user-id-1');
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_DELETED' }),
      );
      expect(result).toEqual({ deleted: true });
    });
  });

  // ── checkMatricule ────────────────────────────────────────────────────

  describe('checkMatricule', () => {
    it('returns exists:true when matricule found', async () => {
      usersService.findByMatricule.mockResolvedValue(makeUser() as any);
      const result = await controller.checkMatricule('EMP001');
      expect(result).toEqual({ exists: true });
    });

    it('returns exists:false when matricule not found', async () => {
      usersService.findByMatricule.mockResolvedValue(null);
      const result = await controller.checkMatricule('EMP999');
      expect(result).toEqual({ exists: false });
    });
  });

  // ── nextMatricule ─────────────────────────────────────────────────────

  describe('nextMatricule', () => {
    it('returns next matricule for given role', async () => {
      usersService.nextMatricule.mockResolvedValue('EMP005');
      const result = await controller.nextMatricule('EMPLOYEE');
      expect(usersService.nextMatricule).toHaveBeenCalledWith('EMPLOYEE');
      expect(result).toEqual({ matricule: 'EMP005' });
    });
  });

  // ── suspendUser ───────────────────────────────────────────────────────

  describe('suspendUser', () => {
    it('suspends user and sends email notification', async () => {
      const user = makeUser();
      const suspended = makeUser({ status: 'SUSPENDED' });
      usersService.findById.mockResolvedValue(user as any);
      usersService.update.mockResolvedValue(suspended as any);

      const result = await controller.suspendUser('user-id-1', { reason: 'Misconduct' });

      expect(usersService.update).toHaveBeenCalledWith('user-id-1', { status: 'SUSPENDED' });
      expect(mailService.sendAccountSuspendedEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: user.email }),
      );
      expect(result).toHaveProperty('message');
      expect(result.status).toBe('SUSPENDED');
    });
  });

  // ── uploadCsv ─────────────────────────────────────────────────────────

  describe('uploadCsv', () => {
    it('throws BadRequestException when no file uploaded', async () => {
      await expect(controller.uploadCsv(null as any, mockReq() as any)).rejects.toThrow(BadRequestException);
    });
  });
});
