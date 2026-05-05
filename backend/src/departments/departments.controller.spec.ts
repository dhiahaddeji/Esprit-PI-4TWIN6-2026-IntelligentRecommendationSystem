import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

const makeDept = (overrides: any = {}) => ({
  _id: 'dept-id-1',
  name: 'Engineering',
  code: 'ENG',
  ...overrides,
});

describe('DepartmentsController', () => {
  let controller: DepartmentsController;
  let svc: jest.Mocked<DepartmentsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentsController],
      providers: [
        {
          provide: DepartmentsService,
          useValue: {
            findAll: jest.fn(),
            getWithMembers: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DepartmentsController>(DepartmentsController);
    svc = module.get(DepartmentsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all departments', () => {
      const depts = [makeDept()];
      svc.findAll.mockReturnValue(depts as any);
      expect(controller.findAll()).toBe(depts);
    });
  });

  describe('getWithMembers', () => {
    it('returns departments with members', () => {
      const data = [{ ...makeDept(), employees: [], managers: [] }];
      svc.getWithMembers.mockReturnValue(data as any);
      expect(controller.getWithMembers()).toBe(data);
    });
  });

  describe('findOne', () => {
    it('returns department by id', () => {
      const dept = makeDept();
      svc.findById.mockReturnValue(dept as any);
      const result = controller.findOne('dept-id-1');
      expect(svc.findById).toHaveBeenCalledWith('dept-id-1');
      expect(result).toBe(dept);
    });
  });

  describe('create', () => {
    it('creates a department', () => {
      const dept = makeDept();
      svc.create.mockReturnValue(dept as any);
      const result = controller.create({ name: 'Engineering', code: 'ENG' });
      expect(svc.create).toHaveBeenCalledWith({ name: 'Engineering', code: 'ENG' });
      expect(result).toBe(dept);
    });
  });

  describe('update', () => {
    it('updates a department', () => {
      const updated = makeDept({ name: 'Engineering Updated' });
      svc.update.mockReturnValue(updated as any);
      const result = controller.update('dept-id-1', { name: 'Engineering Updated' });
      expect(svc.update).toHaveBeenCalledWith('dept-id-1', { name: 'Engineering Updated' });
      expect(result).toBe(updated);
    });
  });

  describe('assignManager', () => {
    it('assigns manager to department', () => {
      svc.update.mockReturnValue(makeDept() as any);
      controller.assignManager('dept-id-1', { manager_id: 'mgr-1' });
      expect(svc.update).toHaveBeenCalledWith('dept-id-1', { manager_id: 'mgr-1' });
    });

    it('passes undefined when manager_id is null', () => {
      svc.update.mockReturnValue(makeDept() as any);
      controller.assignManager('dept-id-1', { manager_id: null });
      expect(svc.update).toHaveBeenCalledWith('dept-id-1', { manager_id: undefined });
    });
  });

  describe('delete', () => {
    it('deletes a department', () => {
      svc.delete.mockReturnValue({ deleted: true } as any);
      const result = controller.delete('dept-id-1');
      expect(svc.delete).toHaveBeenCalledWith('dept-id-1');
      expect(result).toEqual({ deleted: true });
    });
  });
});
