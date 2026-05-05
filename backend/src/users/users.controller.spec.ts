import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

const makeUser = (overrides: any = {}) => ({
  _id: 'user-id-1',
  email: 'a@a.com',
  role: 'EMPLOYEE',
  name: 'Test User',
  toObject: jest.fn().mockReturnValue({ _id: 'user-id-1', email: 'a@a.com', role: 'EMPLOYEE', name: 'Test User' }),
  ...overrides,
});

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            listPaginated: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
    jest.clearAllMocks();
  });

  // ── managers ──────────────────────────────────────────────────────────

  describe('managers', () => {
    it('returns only MANAGER-role users', async () => {
      usersService.findAll.mockResolvedValue([
        makeUser({ role: 'MANAGER' }),
        makeUser({ _id: 'u2', role: 'EMPLOYEE' }),
      ] as any);

      const result = await controller.managers();
      expect(result).toHaveLength(1);
      expect((result[0] as any).role).toBe('MANAGER');
    });

    it('returns empty array when no managers', async () => {
      usersService.findAll.mockResolvedValue([makeUser({ role: 'EMPLOYEE' })] as any);
      const result = await controller.managers();
      expect(result).toEqual([]);
    });
  });

  // ── employees ─────────────────────────────────────────────────────────

  describe('employees', () => {
    it('returns all employees when no pagination query', async () => {
      usersService.findAll.mockResolvedValue([
        makeUser({ role: 'EMPLOYEE' }),
        makeUser({ _id: 'u2', role: 'HR' }),
      ] as any);

      const result = await controller.employees({} as any);
      expect((result as any[]).filter(u => (u as any).role === 'EMPLOYEE')).toHaveLength(1);
    });

    it('delegates to listPaginated when page/limit provided', async () => {
      const paged = { data: [makeUser({ role: 'EMPLOYEE' })], total: 1, page: 1, limit: 10 };
      usersService.listPaginated.mockResolvedValue(paged as any);

      const result = await controller.employees({ page: 1, limit: 10 } as any);
      expect(result).toBe(paged);
      expect(usersService.listPaginated).toHaveBeenCalledWith(
        { role: 'EMPLOYEE' }, 1, 10,
      );
    });
  });

  // ── updateProfile ─────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('updates and returns safe user object', async () => {
      const updated = makeUser({ firstName: 'Alice', lastName: 'Martin' });
      usersService.update.mockResolvedValue(updated as any);

      const req = { user: { userId: 'user-id-1' } };
      const body = { firstName: 'Alice', lastName: 'Martin' };
      const result = await controller.updateProfile(req as any, body as any, {});

      expect(usersService.update).toHaveBeenCalledWith(
        'user-id-1',
        expect.objectContaining({ firstName: 'Alice', lastName: 'Martin' }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('includes photoUrl when photo file uploaded', async () => {
      const updated = makeUser({ photoUrl: 'http://localhost:3000/uploads/avatars/pic.jpg' });
      usersService.update.mockResolvedValue(updated as any);

      const req = { user: { userId: 'user-id-1' } };
      const files = { photo: [{ filename: 'pic.jpg' }] };
      await controller.updateProfile(req as any, {} as any, files as any);

      expect(usersService.update).toHaveBeenCalledWith(
        'user-id-1',
        expect.objectContaining({ photoUrl: expect.stringContaining('pic.jpg') }),
      );
    });
  });

  // ── assignDepartment ──────────────────────────────────────────────────

  describe('assignDepartment', () => {
    it('calls update with departement_id', async () => {
      usersService.update.mockResolvedValue(makeUser({ departement_id: 'dept-1' }) as any);

      const result = await controller.assignDepartment('user-id-1', {
        departement_id: 'dept-1',
      } as any);

      expect(usersService.update).toHaveBeenCalledWith('user-id-1', {
        departement_id: 'dept-1',
      });
    });

    it('sets departement_id to null when not provided', async () => {
      usersService.update.mockResolvedValue(makeUser() as any);
      await controller.assignDepartment('user-id-1', {} as any);
      expect(usersService.update).toHaveBeenCalledWith('user-id-1', { departement_id: null });
    });
  });

  // ── byId ──────────────────────────────────────────────────────────────

  describe('byId', () => {
    it('returns user by id', async () => {
      const user = makeUser();
      usersService.findById.mockResolvedValue(user as any);

      const result = await controller.byId('user-id-1');
      expect(result).toBe(user);
      expect(usersService.findById).toHaveBeenCalledWith('user-id-1');
    });
  });
});
