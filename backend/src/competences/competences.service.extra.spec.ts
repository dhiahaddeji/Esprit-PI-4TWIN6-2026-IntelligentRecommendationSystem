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

describe('CompetencesService (extra)', () => {
  let service: CompetencesService;
  let compModel: any;
  let ficheModel: any;
  let questionModel: any;

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
    jest.clearAllMocks();
  });

  // ── saveCompetences ───────────────────────────────────────────────────

  describe('saveCompetences', () => {
    it('creates fiche when none exists and saves competences', async () => {
      const fiche = makeFiche();
      ficheModel.findOne.mockResolvedValue(null);
      ficheModel.create.mockResolvedValue(fiche);
      compModel.deleteMany.mockResolvedValue({});
      compModel.insertMany.mockResolvedValue([]);
      compModel.find.mockResolvedValue([]);

      const result = await service.saveCompetences('emp-id-1', 'Alice', [
        { type: 'savoir', intitule: 'Python', auto_eval: 3 },
      ]);

      expect(ficheModel.create).toHaveBeenCalled();
      expect(compModel.insertMany).toHaveBeenCalled();
      expect(result).toHaveProperty('fiche');
    });

    it('updates existing fiche and replaces competences', async () => {
      const fiche = makeFiche({ etat: 'submitted' });
      ficheModel.findOne.mockResolvedValue(fiche);
      compModel.deleteMany.mockResolvedValue({});
      compModel.insertMany.mockResolvedValue([]);
      compModel.find.mockResolvedValue([]);

      await service.saveCompetences('emp-id-1', 'Alice', [
        { type: 'savoir', intitule: 'Docker', auto_eval: 2 },
      ]);

      expect(fiche.etat).toBe('draft');
      expect(fiche.save).toHaveBeenCalled();
      expect(compModel.deleteMany).toHaveBeenCalled();
    });

    it('handles empty competences array', async () => {
      const fiche = makeFiche();
      ficheModel.findOne.mockResolvedValue(fiche);
      compModel.deleteMany.mockResolvedValue({});
      compModel.insertMany.mockResolvedValue([]);
      compModel.find.mockResolvedValue([]);

      const result = await service.saveCompetences('emp-id-1', 'Alice', []);
      expect(compModel.insertMany).toHaveBeenCalledWith([]);
      expect(result).toHaveProperty('fiche');
    });
  });

  // ── addSingleCompetence ───────────────────────────────────────────────

  describe('addSingleCompetence', () => {
    it('creates fiche if none exists and adds competence', async () => {
      ficheModel.findOne.mockResolvedValue(null);
      ficheModel.create.mockResolvedValue(makeFiche());
      compModel.create.mockResolvedValue(makeComp());

      const result = await service.addSingleCompetence('emp-id-1', 'Alice', {
        intitule: 'Python',
        type: 'savoir',
        auto_eval: 2,
      });

      expect(ficheModel.create).toHaveBeenCalled();
      expect(compModel.create).toHaveBeenCalled();
      expect(result).toHaveProperty('intitule', 'Python');
    });

    it('uses existing fiche when found', async () => {
      ficheModel.findOne.mockResolvedValue(makeFiche());
      compModel.create.mockResolvedValue(makeComp());

      await service.addSingleCompetence('emp-id-1', 'Alice', {
        intitule: 'Docker',
        type: 'savoir',
        auto_eval: 3,
      });

      expect(ficheModel.create).not.toHaveBeenCalled();
      expect(compModel.create).toHaveBeenCalled();
    });
  });

  // ── getPendingFiches ──────────────────────────────────────────────────

  describe('getPendingFiches', () => {
    it('returns submitted fiches with their competences', async () => {
      const fiches = [makeFiche({ etat: 'submitted' })];
      ficheModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(fiches) });
      compModel.find.mockResolvedValue([makeComp()]);

      const result = await service.getPendingFiches();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('fiche');
      expect(result[0]).toHaveProperty('competences');
    });

    it('returns empty array when no pending fiches', async () => {
      ficheModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

      const result = await service.getPendingFiches();
      expect(result).toEqual([]);
    });
  });

  // ── getAllFiches ───────────────────────────────────────────────────────

  describe('getAllFiches', () => {
    it('returns all fiches with competences', async () => {
      const fiches = [makeFiche(), makeFiche({ _id: { toString: () => 'fiche-id-2' } })];
      ficheModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(fiches) });
      compModel.find.mockResolvedValue([]);

      const result = await service.getAllFiches();
      expect(result).toHaveLength(2);
    });
  });

  // ── getFicheById ──────────────────────────────────────────────────────

  describe('getFicheById', () => {
    it('returns fiche with competences', async () => {
      ficheModel.findById.mockResolvedValue(makeFiche());
      compModel.find.mockResolvedValue([makeComp()]);

      const result = await service.getFicheById('fiche-id-1');
      expect(result).toHaveProperty('fiche');
      expect(result).toHaveProperty('competences');
    });

    it('throws NotFoundException when fiche not found', async () => {
      ficheModel.findById.mockResolvedValue(null);
      await expect(service.getFicheById('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateCompetence ──────────────────────────────────────────────────

  describe('updateCompetence', () => {
    it('updates competence fields', async () => {
      const comp = makeComp({ intitule: 'Updated Python' });
      compModel.findByIdAndUpdate.mockResolvedValue(comp);

      const result = await service.updateCompetence('comp-id-1', { intitule: 'Updated Python' });
      expect(result).toBe(comp);
    });

    it('throws NotFoundException when not found', async () => {
      compModel.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.updateCompetence('bad-id', { intitule: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  // ── addCompetenceToFiche ──────────────────────────────────────────────

  describe('addCompetenceToFiche', () => {
    it('adds competence to existing fiche', async () => {
      ficheModel.findById.mockResolvedValue(makeFiche());
      compModel.create.mockResolvedValue(makeComp());

      const result = await service.addCompetenceToFiche('fiche-id-1', {
        intitule: 'Python',
        type: 'savoir',
        auto_eval: 2,
      });

      expect(compModel.create).toHaveBeenCalled();
      expect(result).toHaveProperty('intitule', 'Python');
    });

    it('throws NotFoundException when fiche not found', async () => {
      ficheModel.findById.mockResolvedValue(null);
      await expect(
        service.addCompetenceToFiche('bad-id', { intitule: 'Python', type: 'savoir', auto_eval: 2 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getAllEmployeesCompetences ─────────────────────────────────────────

  describe('getAllEmployeesCompetences', () => {
    it('returns validated employees with their competences', async () => {
      const fiches = [makeFiche({ etat: 'validated' })];
      ficheModel.find.mockResolvedValue(fiches);
      compModel.find.mockResolvedValue([
        makeComp({ hierarchie_eval: 3, etat: 'validated' }),
      ]);

      const result = await service.getAllEmployeesCompetences();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('employee_id', 'emp-id-1');
      expect(result[0].competences).toHaveLength(1);
    });

    it('returns empty array when no validated fiches', async () => {
      ficheModel.find.mockResolvedValue([]);
      const result = await service.getAllEmployeesCompetences();
      expect(result).toEqual([]);
    });

    it('uses auto_eval when hierarchie_eval is -1', async () => {
      const fiches = [makeFiche({ etat: 'validated' })];
      ficheModel.find.mockResolvedValue(fiches);
      compModel.find.mockResolvedValue([
        makeComp({ hierarchie_eval: -1, auto_eval: 2, etat: 'validated' }),
      ]);

      const result = await service.getAllEmployeesCompetences();
      expect(result[0].competences[0].score).toBeGreaterThanOrEqual(0);
    });
  });
});
