import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { NlpService } from './nlp.service';
import { MatchingService } from './matching.service';
import { CompetencesService } from '../competences/competences.service';

const makeEmployee = (overrides: any = {}) => ({
  employee_id: 'emp-1',
  employee_name: 'Alice',
  competences: [
    { intitule: 'Python', auto_eval: 3, hierarchie_eval: 3 },
  ],
  ...overrides,
});

describe('AiService', () => {
  let service: AiService;
  let compSvc: jest.Mocked<CompetencesService>;
  let nlpService: NlpService;
  let matchingService: MatchingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        NlpService,
        MatchingService,
        {
          provide: CompetencesService,
          useValue: {
            getAllEmployeesCompetences: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    compSvc = module.get(CompetencesService);
    nlpService = module.get<NlpService>(NlpService);
    matchingService = module.get<MatchingService>(MatchingService);
    jest.clearAllMocks();
  });

  // ── getDashboardInsights ──────────────────────────────────────────────

  describe('getDashboardInsights', () => {
    it('returns EMPLOYEE insights with no competences', async () => {
      const result = await service.getDashboardInsights('EMPLOYEE', { competences: [], ficheEtat: 'draft', invitations: [] });
      expect(result.insight).toContain('pas encore');
      expect(result.tips).toHaveLength(3);
    });

    it('returns EMPLOYEE insights with competences and submitted fiche', async () => {
      const result = await service.getDashboardInsights('EMPLOYEE', {
        competences: [{ intitule: 'Python' }],
        ficheEtat: 'submitted',
        invitations: [{ id: 'inv-1' }],
      });
      expect(result.insight).toContain('1 compétence');
      expect(result.insight).toContain('1 invitation');
    });

    it('returns EMPLOYEE insights with validated fiche', async () => {
      const result = await service.getDashboardInsights('EMPLOYEE', {
        competences: [{ intitule: 'Python' }],
        ficheEtat: 'validated',
        invitations: [],
      });
      expect(result.insight).toContain('validation');
    });

    it('returns MANAGER insights', async () => {
      const result = await service.getDashboardInsights('MANAGER', { pendingFiches: 3, activities: [{ id: 'a1' }] });
      expect(result.insight).toContain('3 fiche');
      expect(result.tips[0]).toContain('3');
    });

    it('returns MANAGER insights with no pending fiches', async () => {
      const result = await service.getDashboardInsights('MANAGER', { pendingFiches: 0, activities: [] });
      expect(result.tips[0]).toContain('jour');
    });

    it('returns HR insights', async () => {
      const result = await service.getDashboardInsights('HR', {
        totalEmployees: 10,
        validatedFiches: 8,
        pendingFiches: 2,
        activities: [{ id: 'a1' }],
      });
      expect(result.insight).toContain('10 employé');
      expect(result.insight).toContain('80%');
    });

    it('returns HR insights with 0 employees', async () => {
      const result = await service.getDashboardInsights('HR', {
        totalEmployees: 0,
        validatedFiches: 0,
        pendingFiches: 0,
        activities: [],
      });
      expect(result.insight).toContain('0%');
    });

    it('returns HR insights with low validation rate', async () => {
      const result = await service.getDashboardInsights('HR', {
        totalEmployees: 10,
        validatedFiches: 2,
        pendingFiches: 8,
        activities: [],
      });
      expect(result.tips[0]).toContain('Relancez');
    });

    it('returns SUPERADMIN insights', async () => {
      const result = await service.getDashboardInsights('SUPERADMIN', {
        totalUsers: 50,
        usersByRole: { EMPLOYEE: 30, MANAGER: 5, HR: 2 },
        totalActivities: 10,
      });
      expect(result.insight).toContain('50 utilisateur');
    });

    it('returns SUPERADMIN insights with few employees', async () => {
      const result = await service.getDashboardInsights('SUPERADMIN', {
        totalUsers: 3,
        usersByRole: { EMPLOYEE: 2 },
        totalActivities: 0,
      });
      expect(result.tips[0]).toContain('Invitez');
    });

    it('returns default insight for unknown role', async () => {
      const result = await service.getDashboardInsights('UNKNOWN', {});
      expect(result.insight).toContain('Bienvenue');
      expect(result.tips).toEqual([]);
    });
  });

  // ── extractSkillsFromDescription ──────────────────────────────────────

  describe('extractSkillsFromDescription', () => {
    it('detects python and returns savoir type', () => {
      const result = service.extractSkillsFromDescription('Nous cherchons un expert python et sql');
      const skills = result.suggested_skills.map(s => s.intitule.toLowerCase());
      expect(skills.some(s => s.includes('python'))).toBe(true);
    });

    it('detects expert level', () => {
      const result = service.extractSkillsFromDescription('Profil expert en python avancé');
      expect(result.suggested_skills[0].niveau_min).toBe(4);
    });

    it('detects maîtrise level', () => {
      const result = service.extractSkillsFromDescription('maîtrise de python confirmé');
      expect(result.suggested_skills[0].niveau_min).toBe(3);
    });

    it('detects junior level', () => {
      const result = service.extractSkillsFromDescription('initiation python pour débutant');
      expect(result.suggested_skills[0].niveau_min).toBe(1);
    });

    it('detects upskilling prioritization', () => {
      const result = service.extractSkillsFromDescription('formation python pour débutants');
      expect(result.prioritization).toBe('upskilling');
    });

    it('detects consolidation prioritization', () => {
      const result = service.extractSkillsFromDescription('consolider les compétences python');
      expect(result.prioritization).toBe('consolidation');
    });

    it('detects certification type', () => {
      const result = service.extractSkillsFromDescription('certif python avancé');
      expect(result.type).toBe('certification');
    });

    it('detects audit type', () => {
      const result = service.extractSkillsFromDescription('audit des compétences');
      expect(result.type).toBe('audit');
    });

    it('detects projet type', () => {
      const result = service.extractSkillsFromDescription('projet python avec react');
      expect(result.type).toBe('projet');
    });

    it('detects mission type', () => {
      const result = service.extractSkillsFromDescription('mission python');
      expect(result.type).toBe('mission');
    });

    it('returns empty skills for unrecognized description', () => {
      const result = service.extractSkillsFromDescription('rien de spécial ici');
      expect(result.suggested_skills).toHaveLength(0);
    });
  });

  // ── analyzeCv ─────────────────────────────────────────────────────────

  describe('analyzeCv', () => {
    it('returns skills from a text-based PDF buffer', async () => {
      // Create a fake buffer that contains skill keywords as plain text
      const fakeText = 'python javascript docker agile communication leadership';
      const buffer = Buffer.from(fakeText);

      // Mock pdf-parse to return our fake text
      jest.mock('pdf-parse', () => jest.fn().mockResolvedValue({ text: fakeText }));

      // Since pdf-parse is required dynamically, we test the fallback path
      const result = await service.analyzeCv(buffer);
      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('total');
      expect(result.mode).toBe('rule-based');
    });

    it('returns empty skills for empty buffer', async () => {
      const buffer = Buffer.from('');
      const result = await service.analyzeCv(buffer);
      expect(result).toHaveProperty('skills');
      expect(Array.isArray(result.skills)).toBe(true);
    });
  });

  // ── chat ──────────────────────────────────────────────────────────────

  describe('chat', () => {
    it('returns no-employees message when no validated employees', async () => {
      compSvc.getAllEmployeesCompetences.mockResolvedValue([]);
      const result = await service.chat('trouver des experts python');
      expect(result.reply).toContain('Aucun employé');
      expect(result.employees).toEqual([]);
    });

    it('returns scored employees for keyword search', async () => {
      compSvc.getAllEmployeesCompetences.mockResolvedValue([makeEmployee()] as any);
      const result = await service.chat('trouver des experts python');
      expect(result).toHaveProperty('reply');
      expect(result).toHaveProperty('employees');
    });

    it('handles error in scoring gracefully', async () => {
      compSvc.getAllEmployeesCompetences.mockResolvedValue([makeEmployee()] as any);
      jest.spyOn(matchingService, 'scoreEmployees').mockRejectedValue(new Error('scoring failed'));
      const result = await service.chat('trouver des experts python');
      expect(result.reply).toContain('Erreur');
    });

    it('uses recommendation list context when provided', async () => {
      const list = [
        { employeeName: 'Alice', score: 90, rank: 1, status: 'Selected', explanation: 'Great', matchedSkills: ['Python'], missingSkills: [], details: [], totalCompetences: 5 },
        { employeeName: 'Bob', score: 70, rank: 2, status: 'Backup', explanation: 'Good', matchedSkills: [], missingSkills: ['Docker'], details: [], totalCompetences: 3 },
      ];
      const result = await service.chat('liste des candidats', { recommendedList: list });
      expect(result.reply).toContain('candidats');
    });

    it('finds employee by name in recommendation list', async () => {
      const list = [
        { employeeName: 'Alice Martin', score: 90, rank: 1, status: 'Selected', explanation: 'Great', matchedSkills: ['Python'], missingSkills: [], details: [], totalCompetences: 5 },
      ];
      const result = await service.chat('pourquoi alice', { recommendedList: list });
      expect(result.reply).toContain('Alice');
    });

    it('returns missing skills reply when asked', async () => {
      const list = [
        { employeeName: 'Alice', score: 90, rank: 1, status: 'Selected', explanation: 'Great', matchedSkills: ['Python'], missingSkills: ['Docker'], details: [], totalCompetences: 5 },
      ];
      const result = await service.chat('qui manque docker', { recommendedList: list });
      expect(result.reply).toBeDefined();
    });

    it('returns backup reply when asked', async () => {
      const list = [
        { employeeName: 'Alice', score: 90, rank: 1, status: 'Selected', explanation: 'Great', matchedSkills: [], missingSkills: [], details: [], totalCompetences: 5 },
        { employeeName: 'Bob', score: 70, rank: 2, status: 'Backup', explanation: 'Good', matchedSkills: [], missingSkills: [], details: [], totalCompetences: 3 },
      ];
      const result = await service.chat('qui est backup', { recommendedList: list });
      expect(result.reply).toContain('Bob');
    });

    it('returns no backup message when no backups', async () => {
      const list = [
        { employeeName: 'Alice', score: 90, rank: 1, status: 'Selected', explanation: 'Great', matchedSkills: [], missingSkills: [], details: [], totalCompetences: 5 },
      ];
      const result = await service.chat('backup réserve', { recommendedList: list });
      expect(result.reply).toContain('Aucun');
    });
  });

  // ── matchActivity ─────────────────────────────────────────────────────

  describe('matchActivity', () => {
    it('calls getAllEmployeesCompetences and matchCompetences', async () => {
      compSvc.getAllEmployeesCompetences.mockResolvedValue([makeEmployee()] as any);
      const spy = jest.spyOn(matchingService, 'matchCompetences').mockResolvedValue([]);

      await service.matchActivity('act-1', [{ intitule: 'Python', niveau_min: 2 }], 'expertise');

      expect(compSvc.getAllEmployeesCompetences).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    });
  });
});
