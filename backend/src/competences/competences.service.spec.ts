import { Test, TestingModule } from '@nestjs/testing';
import { CompetencesService } from './competences.service';
import { getModelToken } from '@nestjs/mongoose';
import { Competence } from './competence.schema';
import { FicheCompetence } from './fiche-competence.schema';
import { QuestionCompetence } from './question-competence.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException } from '@nestjs/common';

const makeFiche = (overrides: any = {}) => ({
  _id: { toString: () => 'fiche-id-1' },
  employee_id: 'emp-id-1',
  employee_name: 'Alice',
  etat: 'draft',
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeComp = (overrides: any = {}) => ({
  _id: 'comp-id-1',
  fiche_id: 'fiche-id-1',
  intitule: 'Python',
  type: 'savoir',
  auto_eval: 2,
  hierarchie_eval: -1,
  etat: 'draft',
  ...overrides,
});

const makeQuestion = (overrides: any = {}) => ({
  _id: 'q-id-1',
  intitule: 'Python',
  type: 'savoir',
  actif: true,
  ...overrides,
});

describe('CompetencesService', () => {
  let service: CompetencesService;
  let compModel: any;
  let ficheModel: any;
  let questionModel: any;
  let notifSvc: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    compModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      create: jest.fn(),
      insertMany: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      countDocuments: jest.fn(),
    };
    ficheModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn(),
    };
    questionModel = {
      find: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetencesService,
        { provide: getModelToken(Competence.name), useValue: compModel },
        { provide: getModelToken(FicheCompetence.name), useValue: ficheModel },
        { provide: getModelToken(QuestionCompetence.name), useValue: questionModel },
        {
          provide: NotificationsService,
          useValue: {
            notifyManagersSkillSubmitted: jest.fn().mockResolvedValue(undefined),
            notifyEmployeeValidated: jest.fn().mockResolvedValue(undefined),
            notifyEmployeeRejected: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<CompetencesService>(CompetencesService);
    notifSvc = module.get(NotificationsService);
    jest.clearAllMocks();
  });

  // ── getCatalog ────────────────────────────────────────────────────────

  describe('getCatalog', () => {
    it('returns active questions sorted by type and intitule', async () => {
      const questions = [makeQuestion()];
      questionModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(questions),
      });

      const result = await service.getCatalog();
      expect(result).toBe(questions);
      expect(questionModel.find).toHaveBeenCalledWith({ actif: true });
    });
  });

  // ── createQuestion ────────────────────────────────────────────────────

  describe('createQuestion', () => {
    it('creates a new question', async () => {
      const q = makeQuestion();
      questionModel.create.mockResolvedValue(q);

      const result = await service.createQuestion({ intitule: 'Python', type: 'savoir' } as any);
      expect(result).toBe(q);
    });
  });

  // ── deleteQuestion ────────────────────────────────────────────────────

  describe('deleteQuestion', () => {
    it('soft-deletes question by setting actif=false', async () => {
      questionModel.findByIdAndUpdate.mockResolvedValue(makeQuestion({ actif: false }));

      await service.deleteQuestion('q-id-1');
      expect(questionModel.findByIdAndUpdate).toHaveBeenCalledWith('q-id-1', { actif: false });
    });
  });

  // ── getMyFiche ────────────────────────────────────────────────────────

  describe('getMyFiche', () => {
    it('returns existing fiche with competences', async () => {
      const fiche = makeFiche();
      const comps = [makeComp()];
      ficheModel.findOne.mockResolvedValue(fiche);
      compModel.find.mockResolvedValue(comps);

      const result = await service.getMyFiche('emp-id-1');
      expect(result.fiche).toBe(fiche);
      expect(result.competences).toBe(comps);
    });

    it('creates fiche if none exists', async () => {
      const newFiche = makeFiche();
      ficheModel.findOne.mockResolvedValue(null);
      ficheModel.create.mockResolvedValue(newFiche);
      compModel.find.mockResolvedValue([]);

      const result = await service.getMyFiche('emp-id-1');
      expect(ficheModel.create).toHaveBeenCalledWith({
        employee_id: 'emp-id-1',
        etat: 'draft',
      });
      expect(result.fiche).toBe(newFiche);
    });
  });

  // ── submit ────────────────────────────────────────────────────────────

  describe('submit', () => {
    it('throws NotFoundException when fiche not found', async () => {
      ficheModel.findOne.mockResolvedValue(null);
      await expect(service.submit('emp-id-1', 'Alice')).rejects.toThrow(NotFoundException);
    });

    it('submits fiche and notifies managers', async () => {
      const fiche = makeFiche();
      ficheModel.findOne.mockResolvedValue(fiche);
      compModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
      compModel.find.mockResolvedValue([]);

      await service.submit('emp-id-1', 'Alice');

      expect(fiche.etat).toBe('submitted');
      expect(fiche.save).toHaveBeenCalled();
    });
  });

  // ── evalCompetence ────────────────────────────────────────────────────

  describe('evalCompetence', () => {
    it('updates hierarchie_eval and sets etat=validated', async () => {
      const comp = makeComp({ hierarchie_eval: 3, etat: 'validated' });
      compModel.findByIdAndUpdate.mockResolvedValue(comp);

      const result = await service.evalCompetence('comp-id-1', 3);
      expect(result).toBe(comp);
      expect(compModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'comp-id-1',
        { hierarchie_eval: 3, etat: 'validated' },
        { returnDocument: 'after' },
      );
    });

    it('throws NotFoundException when competence not found', async () => {
      compModel.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.evalCompetence('bad-id', 2)).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateAutoEval ────────────────────────────────────────────────────

  describe('updateAutoEval', () => {
    it('updates auto_eval', async () => {
      const comp = makeComp({ auto_eval: 3 });
      compModel.findByIdAndUpdate.mockResolvedValue(comp);

      const result = await service.updateAutoEval('comp-id-1', 3);
      expect(result).toBe(comp);
    });

    it('throws NotFoundException when not found', async () => {
      compModel.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.updateAutoEval('bad-id', 2)).rejects.toThrow(NotFoundException);
    });
  });

  // ── deleteCompetence ──────────────────────────────────────────────────

  describe('deleteCompetence', () => {
    it('deletes competence and returns confirmation', async () => {
      compModel.findByIdAndDelete.mockResolvedValue(makeComp());
      const result = await service.deleteCompetence('comp-id-1');
      expect(result).toEqual({ deleted: true });
    });

    it('throws NotFoundException when not found', async () => {
      compModel.findByIdAndDelete.mockResolvedValue(null);
      await expect(service.deleteCompetence('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── validateFiche ─────────────────────────────────────────────────────

  describe('validateFiche', () => {
    it('throws NotFoundException when fiche not found', async () => {
      ficheModel.findById.mockResolvedValue(null);
      await expect(service.validateFiche('bad-id', 'mgr-1')).rejects.toThrow(NotFoundException);
    });

    it('validates fiche and notifies employee', async () => {
      const fiche = makeFiche({ etat: 'submitted' });
      ficheModel.findById
        .mockResolvedValueOnce(fiche)
        .mockResolvedValueOnce(fiche);
      compModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
      compModel.find.mockResolvedValue([]);

      await service.validateFiche('fiche-id-1', 'mgr-1');

      expect(fiche.etat).toBe('validated');
      expect(fiche.validated_by).toBe('mgr-1');
      expect(fiche.save).toHaveBeenCalled();
    });
  });

  // ── rejectFiche ───────────────────────────────────────────────────────

  describe('rejectFiche', () => {
    it('throws NotFoundException when fiche not found', async () => {
      ficheModel.findById.mockResolvedValue(null);
      await expect(service.rejectFiche('bad-id', 'mgr-1', 'reason')).rejects.toThrow(NotFoundException);
    });

    it('rejects fiche and notifies employee', async () => {
      const fiche = makeFiche({ etat: 'submitted' });
      ficheModel.findById.mockResolvedValue(fiche);
      compModel.updateMany.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.rejectFiche('fiche-id-1', 'mgr-1', 'Incomplete data');

      expect(fiche.etat).toBe('rejected');
      expect(fiche.rejection_note).toBe('Incomplete data');
      expect(fiche.save).toHaveBeenCalled();
      expect(result).toBe(fiche);
    });
  });

  // ── getAnalytics ──────────────────────────────────────────────────────

  describe('getAnalytics', () => {
    it('returns analytics with byType and topSkills', async () => {
      const comps = [
        makeComp({ type: 'savoir', intitule: 'Python', hierarchie_eval: 3 }),
        makeComp({ type: 'savoir_faire', intitule: 'Git', hierarchie_eval: -1, auto_eval: 2 }),
      ];
      compModel.find.mockResolvedValue(comps);
      ficheModel.countDocuments
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(2);

      const result = await service.getAnalytics();

      expect(result).toHaveProperty('totalFiches', 10);
      expect(result).toHaveProperty('validated', 8);
      expect(result).toHaveProperty('topSkills');
      expect(Array.isArray(result.topSkills)).toBe(true);
    });
  });
});
