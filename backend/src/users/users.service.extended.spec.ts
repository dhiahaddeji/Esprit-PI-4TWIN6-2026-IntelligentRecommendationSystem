import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { NotFoundException } from '@nestjs/common';

const makeUser = (overrides: any = {}) => ({
  _id: 'user-id-1',
  email: 'test@example.com',
  role: 'EMPLOYEE',
  name: 'Test User',
  matricule: 'EMP1',
  ...overrides,
});

function selectChain(returnValue: any) {
  const chain: any = {
    select: jest.fn(),
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    exec: jest.fn().mockResolvedValue(returnValue),
  };
  chain.select.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.skip.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

describe('UsersService — extended methods', () => {
  let service: UsersService;
  let userModel: any;

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ── delete ────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes user by id', async () => {
      userModel.findByIdAndDelete.mockResolvedValue(makeUser());
      await service.delete('user-id-1');
      expect(userModel.findByIdAndDelete).toHaveBeenCalledWith('user-id-1');
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns users without sensitive fields', async () => {
      const users = [makeUser(), makeUser({ _id: 'user-id-2' })];
      const chain = selectChain(users);
      userModel.find.mockReturnValue(chain);

      const result = await service.findAll();
      expect(result).toBe(users);
      expect(chain.select).toHaveBeenCalledWith(
        expect.stringContaining('-password'),
      );
    });
  });

  // ── listPaginated ─────────────────────────────────────────────────────

  describe('listPaginated', () => {
    function makeChain(users: any[]) {
      const chain: any = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(users),
      };
      return chain;
    }

    it('returns paginated result with total', async () => {
      const users = [makeUser()];
      userModel.find.mockReturnValue(makeChain(users));
      userModel.countDocuments.mockResolvedValue(1);

      const result = await service.listPaginated({}, 1, 10);
      expect(result).toMatchObject({ data: users, total: 1, page: 1, limit: 10 });
    });

    it('uses default page 1 and limit 20', async () => {
      userModel.find.mockReturnValue(makeChain([]));
      userModel.countDocuments.mockResolvedValue(0);

      const result = await service.listPaginated({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('caps limit at 200', async () => {
      userModel.find.mockReturnValue(makeChain([]));
      userModel.countDocuments.mockResolvedValue(0);

      const result = await service.listPaginated({}, 1, 9999);
      expect(result.limit).toBe(200);
    });

    it('applies filter to both find and countDocuments', async () => {
      const filter = { role: 'EMPLOYEE' };
      userModel.find.mockReturnValue(makeChain([]));
      userModel.countDocuments.mockResolvedValue(5);

      await service.listPaginated(filter, 1, 10);
      expect(userModel.find).toHaveBeenCalledWith(filter);
      expect(userModel.countDocuments).toHaveBeenCalledWith(filter);
    });
  });

  // ── findById ──────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns user when found', async () => {
      const user = makeUser();
      const chain = selectChain(user);
      userModel.findById.mockReturnValue(chain);

      const result = await service.findById('user-id-1');
      expect(result).toBe(user);
    });

    it('throws NotFoundException when not found', async () => {
      const chain = selectChain(null);
      userModel.findById.mockReturnValue(chain);

      await expect(service.findById('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── findByIdWithRefreshToken ──────────────────────────────────────────

  describe('findByIdWithRefreshToken', () => {
    it('returns user with refresh token fields', async () => {
      const user = makeUser({ refreshTokenHash: '$2b$10$hash' });
      const chain = selectChain(user);
      userModel.findById.mockReturnValue(chain);

      const result = await service.findByIdWithRefreshToken('user-id-1');
      expect(result).toBe(user);
    });

    it('throws NotFoundException when not found', async () => {
      const chain = selectChain(null);
      userModel.findById.mockReturnValue(chain);

      await expect(service.findByIdWithRefreshToken('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findByMatricule ───────────────────────────────────────────────────

  describe('findByMatricule', () => {
    it('queries by matricule', async () => {
      const user = makeUser({ matricule: 'EMP001' });
      userModel.findOne.mockResolvedValue(user);

      const result = await service.findByMatricule('EMP001');
      expect(result).toBe(user);
      expect(userModel.findOne).toHaveBeenCalledWith({ matricule: 'EMP001' });
    });

    it('returns null when not found', async () => {
      userModel.findOne.mockResolvedValue(null);
      const result = await service.findByMatricule('UNKNOWN');
      expect(result).toBeNull();
    });
  });

  // ── findByRole ────────────────────────────────────────────────────────

  describe('findByRole', () => {
    it('returns users with matching role', async () => {
      const managers = [makeUser({ role: 'MANAGER' })];
      const chain = selectChain(managers);
      userModel.find.mockReturnValue(chain);

      const result = await service.findByRole('MANAGER');
      expect(result).toBe(managers);
      expect(userModel.find).toHaveBeenCalledWith({ role: 'MANAGER' });
    });
  });

  // ── findByIds ─────────────────────────────────────────────────────────

  describe('findByIds', () => {
    it('queries $in with provided ids', async () => {
      const users = [makeUser(), makeUser({ _id: 'user-id-2' })];
      const chain = selectChain(users);
      userModel.find.mockReturnValue(chain);

      const result = await service.findByIds(['user-id-1', 'user-id-2']);
      expect(result).toBe(users);
      expect(userModel.find).toHaveBeenCalledWith({
        _id: { $in: ['user-id-1', 'user-id-2'] },
      });
    });
  });

  // ── findRoles ─────────────────────────────────────────────────────────

  describe('findRoles', () => {
    it('queries $in with provided roles', async () => {
      const users = [makeUser({ role: 'HR' }), makeUser({ role: 'MANAGER' })];
      const chain = selectChain(users);
      userModel.find.mockReturnValue(chain);

      const result = await service.findRoles(['HR', 'MANAGER']);
      expect(result).toBe(users);
      expect(userModel.find).toHaveBeenCalledWith({
        role: { $in: ['HR', 'MANAGER'] },
      });
    });
  });

  // ── nextMatricule ─────────────────────────────────────────────────────

  describe('nextMatricule', () => {
    it('returns EMP1 when no existing employees', async () => {
      const chain = selectChain([]);
      userModel.find.mockReturnValue(chain);
      const result = await service.nextMatricule('EMPLOYEE');
      expect(result).toBe('EMP1');
    });

    it('increments from the highest existing matricule', async () => {
      const chain = selectChain([
        { matricule: 'EMP3' },
        { matricule: 'EMP7' },
        { matricule: 'EMP1' },
      ]);
      userModel.find.mockReturnValue(chain);
      const result = await service.nextMatricule('EMPLOYEE');
      expect(result).toBe('EMP8');
    });

    it('uses MGR prefix for MANAGER role', async () => {
      const chain = selectChain([]);
      userModel.find.mockReturnValue(chain);
      const result = await service.nextMatricule('MANAGER');
      expect(result).toBe('MGR1');
    });

    it('uses RH prefix for HR role', async () => {
      const chain = selectChain([]);
      userModel.find.mockReturnValue(chain);
      const result = await service.nextMatricule('HR');
      expect(result).toBe('RH1');
    });

    it('uses ADM prefix for SUPERADMIN role', async () => {
      const chain = selectChain([]);
      userModel.find.mockReturnValue(chain);
      const result = await service.nextMatricule('SUPERADMIN');
      expect(result).toBe('ADM1');
    });

    it('uses USR prefix for unknown role', async () => {
      const chain = selectChain([]);
      userModel.find.mockReturnValue(chain);
      const result = await service.nextMatricule('UNKNOWN');
      expect(result).toBe('USR1');
    });
  });
});
