import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsService } from './departments.service';
import { getModelToken } from '@nestjs/mongoose';
import { Department } from './department.schema';
import { UsersService } from '../users/users.service';
import { NotFoundException } from '@nestjs/common';

const makeDept = (overrides: any = {}) => ({
  _id: 'dept-id-1',
  name: 'Engineering',
  manager_id: null,
  ...overrides,
});

const makeUser = (overrides: any = {}) => ({
  _id: 'user-id-1',
  role: 'EMPLOYEE',
  name: 'Alice',
  email: 'alice@x.com',
  matricule: 'EMP1',
  departement_id: null,
  ...overrides,
});

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let deptModel: any;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    deptModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: getModelToken(Department.name), useValue: deptModel },
        {
          provide: UsersService,
          useValue: { findAll: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<DepartmentsService>(DepartmentsService);
    usersService = module.get(UsersService);
    jest.clearAllMocks();
  });

  // ── findAll ───────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns departments sorted by name', async () => {
      const depts = [makeDept()];
      deptModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(depts) });

      const result = await service.findAll();
      expect(result).toBe(depts);
      expect(deptModel.find).toHaveBeenCalled();
    });
  });

  // ── findById ──────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns department when found', async () => {
      const dept = makeDept();
      deptModel.findById.mockResolvedValue(dept);
      const result = await service.findById('dept-id-1');
      expect(result).toBe(dept);
    });

    it('returns null when not found', async () => {
      deptModel.findById.mockResolvedValue(null);
      const result = await service.findById('bad-id');
      expect(result).toBeNull();
    });
  });

  // ── create ────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates and returns department', async () => {
      const dept = makeDept({ name: 'Marketing' });
      deptModel.create.mockResolvedValue(dept);

      const result = await service.create({ name: 'Marketing' } as any);
      expect(result).toBe(dept);
    });
  });

  // ── update ────────────────────────────────────────────────────────────

  describe('update', () => {
    it('returns updated department', async () => {
      const updated = makeDept({ name: 'HR Dept' });
      deptModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.update('dept-id-1', { name: 'HR Dept' } as any);
      expect(result).toBe(updated);
    });

    it('throws NotFoundException when not found', async () => {
      deptModel.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.update('bad', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes department', async () => {
      deptModel.findByIdAndDelete.mockResolvedValue(makeDept());
      await service.delete('dept-id-1');
      expect(deptModel.findByIdAndDelete).toHaveBeenCalledWith('dept-id-1');
    });
  });

  // ── getWithMembers ────────────────────────────────────────────────────

  describe('getWithMembers', () => {
    it('enriches departments with employees and managers', async () => {
      const dept = { ...makeDept(), _id: 'dept-id-1', manager_id: 'mgr-id-1' };
      const manager = makeUser({ _id: 'mgr-id-1', role: 'MANAGER', name: 'Bob Manager' });
      const employee = makeUser({ _id: 'emp-id-1', role: 'EMPLOYEE', departement_id: 'dept-id-1' });

      deptModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([dept]) }),
      });
      usersService.findAll.mockResolvedValue([manager, employee] as any);

      const result = await service.getWithMembers();

      expect(result.departments).toHaveLength(1);
      expect(result.departments[0].employees).toHaveLength(1);
      expect(result.departments[0].manager).toMatchObject({ name: 'Bob Manager' });
    });

    it('returns unassigned employees separately', async () => {
      deptModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      });
      const unassignedEmp = makeUser({ departement_id: null });
      usersService.findAll.mockResolvedValue([unassignedEmp] as any);

      const result = await service.getWithMembers();
      expect(result.unassigned).toHaveLength(1);
    });

    it('sets manager to null when department has no manager_id', async () => {
      const dept = { ...makeDept(), _id: 'dept-1', manager_id: null };
      deptModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([dept]) }),
      });
      usersService.findAll.mockResolvedValue([]);

      const result = await service.getWithMembers();
      expect(result.departments[0].manager).toBeNull();
    });
  });
});
