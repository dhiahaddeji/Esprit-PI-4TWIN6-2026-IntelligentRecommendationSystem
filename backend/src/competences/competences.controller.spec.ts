import { Test, TestingModule } from '@nestjs/testing';
import { CompetencesController } from './competences.controller';
import { CompetencesService } from './competences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

const mockReq = (overrides: any = {}) => ({
  user: {
    userId: 'emp-id-1',
    name: 'Alice',
    firstName: 'Alice',
    lastName: 'Smith',
    role: 'EMPLOYEE',
    ...overrides,
  },
});

describe('CompetencesController', () => {
  let controller: CompetencesController;
  let svc: jest.Mocked<CompetencesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompetencesController],
      providers: [
        {
          provide: CompetencesService,
          useValue: {
            getCatalog: jest.fn(),
            createQuestion: jest.fn(),
            deleteQuestion: jest.fn(),
            getAnalytics: jest.fn(),
            getAllEmployeesCompetences: jest.fn(),
            getMyFiche: jest.fn(),
            saveCompetences: jest.fn(),
            submit: jest.fn(),
            addSingleCompetence: jest.fn(),
            getPendingFiches: jest.fn(),
            getAllFiches: jest.fn(),
            getFicheById: jest.fn(),
            evalCompetence: jest.fn(),
            updateAutoEval: jest.fn(),
            updateCompetence: jest.fn(),
            deleteCompetence: jest.fn(),
            addCompetenceToFiche: jest.fn(),
            validateFiche: jest.fn(),
            rejectFiche: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CompetencesController>(CompetencesController);
    svc = module.get(CompetencesService);
    jest.clearAllMocks();
  });

  describe('getCatalog', () => {
    it('returns competence catalog', () => {
      const catalog = [{ _id: 'q1', intitule: 'Python' }];
      svc.getCatalog.mockReturnValue(catalog as any);
      expect(controller.getCatalog()).toBe(catalog);
    });
  });

  describe('createQuestion', () => {
    it('creates a catalog question', () => {
      const q = { _id: 'q1', intitule: 'Python' };
      svc.createQuestion.mockReturnValue(q as any);
      const result = controller.createQuestion({ intitule: 'Python' });
      expect(svc.createQuestion).toHaveBeenCalledWith({ intitule: 'Python' });
      expect(result).toBe(q);
    });
  });

  describe('deleteQuestion', () => {
    it('deletes a catalog question', () => {
      svc.deleteQuestion.mockReturnValue({ deleted: true } as any);
      const result = controller.deleteQuestion('q-1');
      expect(svc.deleteQuestion).toHaveBeenCalledWith('q-1');
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('getAnalytics', () => {
    it('returns competence analytics', () => {
      const analytics = { departments: [] };
      svc.getAnalytics.mockReturnValue(analytics as any);
      expect(controller.getAnalytics()).toBe(analytics);
    });
  });

  describe('getAllEmployeesCompetences', () => {
    it('returns all employees competences', () => {
      const data = [{ employee_id: 'e1', competences: [] }];
      svc.getAllEmployeesCompetences.mockReturnValue(data as any);
      expect(controller.getAllEmployeesCompetences()).toBe(data);
    });
  });

  describe('getMyFiche', () => {
    it('returns fiche for current employee', () => {
      const fiche = { _id: 'fiche-1', employeeId: 'emp-id-1' };
      svc.getMyFiche.mockReturnValue(fiche as any);
      const result = controller.getMyFiche(mockReq() as any);
      expect(svc.getMyFiche).toHaveBeenCalledWith('emp-id-1');
      expect(result).toBe(fiche);
    });
  });

  describe('saveCompetences', () => {
    it('saves competences for current employee using firstName/lastName', () => {
      svc.saveCompetences.mockReturnValue({} as any);
      const body = { competences: [{ intitule: 'Python', auto_eval: 3 }] };
      controller.saveCompetences(mockReq() as any, body);
      expect(svc.saveCompetences).toHaveBeenCalledWith('emp-id-1', 'Alice Smith', body.competences);
    });

    it('falls back to user.name when firstName/lastName missing', () => {
      svc.saveCompetences.mockReturnValue({} as any);
      controller.saveCompetences(
        mockReq({ firstName: undefined, lastName: undefined, name: 'Alice' }) as any,
        { competences: [] },
      );
      expect(svc.saveCompetences).toHaveBeenCalledWith('emp-id-1', 'Alice', []);
    });
  });

  describe('submit', () => {
    it('submits the competence fiche', () => {
      svc.submit.mockReturnValue({ status: 'PENDING' } as any);
      const result = controller.submit(mockReq() as any);
      expect(svc.submit).toHaveBeenCalledWith('emp-id-1', 'Alice');
      expect(result).toEqual({ status: 'PENDING' });
    });
  });

  describe('addSingle', () => {
    it('adds a single competence for current employee', () => {
      svc.addSingleCompetence.mockReturnValue({} as any);
      const body = { intitule: 'Python', type: 'technique', auto_eval: 3 };
      controller.addSingle(mockReq() as any, body);
      expect(svc.addSingleCompetence).toHaveBeenCalledWith('emp-id-1', 'Alice Smith', body);
    });
  });

  describe('getPending', () => {
    it('returns pending fiches', () => {
      const fiches = [{ _id: 'fiche-1' }];
      svc.getPendingFiches.mockReturnValue(fiches as any);
      expect(controller.getPending()).toBe(fiches);
    });
  });

  describe('getAllFiches', () => {
    it('returns all fiches', () => {
      const fiches = [{ _id: 'fiche-1' }, { _id: 'fiche-2' }];
      svc.getAllFiches.mockReturnValue(fiches as any);
      expect(controller.getAllFiches()).toBe(fiches);
    });
  });

  describe('getFiche', () => {
    it('returns fiche by id', () => {
      const fiche = { _id: 'fiche-1' };
      svc.getFicheById.mockReturnValue(fiche as any);
      const result = controller.getFiche('fiche-1');
      expect(svc.getFicheById).toHaveBeenCalledWith('fiche-1');
      expect(result).toBe(fiche);
    });
  });

  describe('evalItem', () => {
    it('evaluates a competence item', () => {
      svc.evalCompetence.mockReturnValue({ hierarchie_eval: 3 } as any);
      const result = controller.evalItem('item-1', { hierarchie_eval: 3 });
      expect(svc.evalCompetence).toHaveBeenCalledWith('item-1', 3);
      expect(result).toEqual({ hierarchie_eval: 3 });
    });
  });

  describe('updateAutoEval', () => {
    it('updates auto_eval for a competence item', () => {
      svc.updateAutoEval.mockReturnValue({ auto_eval: 2 } as any);
      const result = controller.updateAutoEval('item-1', { auto_eval: 2 });
      expect(svc.updateAutoEval).toHaveBeenCalledWith('item-1', 2);
      expect(result).toEqual({ auto_eval: 2 });
    });
  });

  describe('updateItem', () => {
    it('updates a competence item', () => {
      svc.updateCompetence.mockReturnValue({ intitule: 'Python Updated' } as any);
      const result = controller.updateItem('item-1', { intitule: 'Python Updated' });
      expect(svc.updateCompetence).toHaveBeenCalledWith('item-1', { intitule: 'Python Updated' });
      expect(result).toEqual({ intitule: 'Python Updated' });
    });
  });

  describe('deleteItem', () => {
    it('deletes a competence item', () => {
      svc.deleteCompetence.mockReturnValue({ deleted: true } as any);
      const result = controller.deleteItem('item-1');
      expect(svc.deleteCompetence).toHaveBeenCalledWith('item-1');
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('addToFiche', () => {
    it('adds a competence to a fiche', () => {
      svc.addCompetenceToFiche.mockReturnValue({} as any);
      const body = { intitule: 'Python', type: 'technique', auto_eval: 2 };
      controller.addToFiche('fiche-1', body);
      expect(svc.addCompetenceToFiche).toHaveBeenCalledWith('fiche-1', body);
    });
  });

  describe('validateFiche', () => {
    it('validates a fiche by manager', () => {
      svc.validateFiche.mockReturnValue({ status: 'VALIDATED' } as any);
      const result = controller.validateFiche('fiche-1', mockReq({ role: 'MANAGER' }) as any);
      expect(svc.validateFiche).toHaveBeenCalledWith('fiche-1', 'emp-id-1');
      expect(result).toEqual({ status: 'VALIDATED' });
    });
  });

  describe('rejectFiche', () => {
    it('rejects a fiche with note', () => {
      svc.rejectFiche.mockReturnValue({ status: 'REJECTED' } as any);
      const result = controller.rejectFiche(
        'fiche-1',
        mockReq({ role: 'MANAGER' }) as any,
        { note: 'Needs improvement' },
      );
      expect(svc.rejectFiche).toHaveBeenCalledWith('fiche-1', 'emp-id-1', 'Needs improvement');
      expect(result).toEqual({ status: 'REJECTED' });
    });

    it('passes empty string when no note provided', () => {
      svc.rejectFiche.mockReturnValue({ status: 'REJECTED' } as any);
      controller.rejectFiche('fiche-1', mockReq() as any, {});
      expect(svc.rejectFiche).toHaveBeenCalledWith('fiche-1', 'emp-id-1', '');
    });
  });
});
