import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeService } from './employee.service';
import { getModelToken } from '@nestjs/mongoose';
import { Employee } from './schemas/employee.schema';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let employeeModel: any;

  beforeEach(async () => {
    employeeModel = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        { provide: getModelToken(Employee.name), useValue: employeeModel },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates an employee record for the given userId', async () => {
      const created = { _id: 'emp-doc-1', user_id: 'user-1' };
      employeeModel.create.mockResolvedValue(created);

      const result = await service.create('user-1');
      expect(employeeModel.create).toHaveBeenCalledWith({ user_id: 'user-1' });
      expect(result).toBe(created);
    });
  });
});
