import { Test, TestingModule } from '@nestjs/testing';
import { MatchingService } from './matching.service';
import { NlpService } from './nlp.service';

const makeEmployee = (overrides: any = {}) => ({
  employee_id: 'emp-1',
  employee_name: 'Alice',
  competences: [
    { intitule: 'Python', auto_eval: 3, hierarchie_eval: 3 },
    { intitule: 'Docker', auto_eval: 2, hierarchie_eval: -1 },
  ],
  ...overrides,
});

describe('MatchingService', () => {
  let service: MatchingService;
  let nlpService: NlpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchingService, NlpService],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
    nlpService = module.get<NlpService>(NlpService);
  });

  // ── detectPrioritization ──────────────────────────────────────────────

  describe('detectPrioritization', () => {
    it('detects upskilling context', () => {
      expect(service.detectPrioritization('formation pour débutants')).toBe('upskilling');
      expect(service.detectPrioritization('upskill the team')).toBe('upskilling');
      expect(service.detectPrioritization('apprendre python')).toBe('upskilling');
    });

    it('detects consolidation context', () => {
      expect(service.detectPrioritization('consolider les acquis')).toBe('consolidation');
      expect(service.detectPrioritization('profil intermédiaire')).toBe('consolidation');
      expect(service.detectPrioritization('renforcer les compétences')).toBe('consolidation');
    });

    it('defaults to expertise', () => {
      expect(service.detectPrioritization('trouver les meilleurs experts')).toBe('expertise');
      expect(service.detectPrioritization('')).toBe('expertise');
    });
  });

  // ── extractTopN ───────────────────────────────────────────────────────

  describe('extractTopN', () => {
    it('extracts number from "top 3"', () => {
      expect(service.extractTopN('top 3 développeurs')).toBe(3);
    });

    it('extracts number from "les 5 meilleurs"', () => {
      expect(service.extractTopN('les 5 meilleurs')).toBe(5);
    });

    it('caps at 20', () => {
      expect(service.extractTopN('top 50 experts')).toBe(20);
    });

    it('defaults to 5 when no number found', () => {
      expect(service.extractTopN('trouver des développeurs python')).toBe(5);
    });
  });

  // ── extractKeywords ───────────────────────────────────────────────────

  describe('extractKeywords', () => {
    it('extracts meaningful keywords', () => {
      const kws = service.extractKeywords('trouver des experts python et react');
      expect(kws).toContain('python');
      expect(kws).toContain('react');
    });

    it('filters out stopwords', () => {
      const kws = service.extractKeywords('les meilleurs développeurs');
      expect(kws).not.toContain('les');
      expect(kws).not.toContain('meilleurs');
    });

    it('filters out short words', () => {
      const kws = service.extractKeywords('un de la');
      expect(kws.every(w => w.length > 2)).toBe(true);
    });

    it('returns empty array for empty string', () => {
      expect(service.extractKeywords('')).toEqual([]);
    });
  });

  // ── scoreEmployees ────────────────────────────────────────────────────

  describe('scoreEmployees', () => {
    it('scores employees with matching keywords', async () => {
      const employees = [makeEmployee()];
      const result = await service.scoreEmployees(employees, ['python'], 'expertise');

      expect(result).toHaveLength(1);
      expect(result[0].computedScore).toBeGreaterThan(0);
      expect(result[0].matched).toContain('Python');
    });

    it('gives universal score when no keywords', async () => {
      const employees = [makeEmployee()];
      const result = await service.scoreEmployees(employees, [], 'expertise');

      expect(result).toHaveLength(1);
      expect(result[0].computedScore).toBeGreaterThanOrEqual(0);
    });

    it('sorts by score descending', async () => {
      const employees = [
        makeEmployee({ employee_id: 'emp-1', competences: [{ intitule: 'Python', auto_eval: 1, hierarchie_eval: 1 }] }),
        makeEmployee({ employee_id: 'emp-2', competences: [{ intitule: 'Python', auto_eval: 4, hierarchie_eval: 4 }] }),
      ];
      const result = await service.scoreEmployees(employees, ['python'], 'expertise');
      expect(result[0].computedScore).toBeGreaterThanOrEqual(result[1].computedScore);
    });

    it('returns empty array for empty employees', async () => {
      const result = await service.scoreEmployees([], ['python'], 'expertise');
      expect(result).toEqual([]);
    });

    it('applies different context weights for upskilling vs expertise', async () => {
      const employees = [
        makeEmployee({ employee_id: 'junior', competences: [{ intitule: 'Python', auto_eval: 1, hierarchie_eval: 1 }] }),
        makeEmployee({ employee_id: 'expert', competences: [{ intitule: 'Python', auto_eval: 4, hierarchie_eval: 4 }] }),
      ];
      const expertiseResult = await service.scoreEmployees(employees, ['python'], 'expertise');
      const upskillResult = await service.scoreEmployees(employees, ['python'], 'upskilling');
      // In expertise, expert should score higher than junior
      const expertiseExpertScore = expertiseResult.find(e => e.employee_id === 'expert')!.computedScore;
      const expertiseJuniorScore = expertiseResult.find(e => e.employee_id === 'junior')!.computedScore;
      expect(expertiseExpertScore).toBeGreaterThan(expertiseJuniorScore);
      // In upskilling, the gap between expert and junior should be smaller than in expertise
      const upskillExpertScore = upskillResult.find(e => e.employee_id === 'expert')!.computedScore;
      const upskillJuniorScore = upskillResult.find(e => e.employee_id === 'junior')!.computedScore;
      const expertiseGap = expertiseExpertScore - expertiseJuniorScore;
      const upskillGap = upskillExpertScore - upskillJuniorScore;
      expect(upskillGap).toBeLessThan(expertiseGap);
    });
  });

  // ── matchCompetences ──────────────────────────────────────────────────

  describe('matchCompetences', () => {
    it('matches employees against required competences', async () => {
      const employees = [makeEmployee()];
      const required = [{ intitule: 'Python', niveau_min: 2 }];

      const result = await service.matchCompetences(employees, required, 'expertise');

      expect(result).toHaveLength(1);
      expect(result[0].details).toHaveLength(1);
      expect(result[0].details[0].intitule).toBe('Python');
    });

    it('marks unmatched competences as not meeting minimum', async () => {
      const employees = [makeEmployee({ competences: [{ intitule: 'Java', auto_eval: 2, hierarchie_eval: 2 }] })];
      const required = [{ intitule: 'Python', niveau_min: 2 }];

      const result = await service.matchCompetences(employees, required, 'expertise');

      expect(result[0].details[0].meets_minimum).toBe(false);
      expect(result[0].details[0].employee_level).toBe(-1);
    });

    it('returns empty array for empty employees', async () => {
      const result = await service.matchCompetences([], [{ intitule: 'Python', niveau_min: 2 }], 'expertise');
      expect(result).toEqual([]);
    });

    it('handles empty required competences', async () => {
      const employees = [makeEmployee()];
      const result = await service.matchCompetences(employees, [], 'expertise');
      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(0);
    });

    it('uses hierarchie_eval when >= 0', async () => {
      const employees = [makeEmployee({
        competences: [{ intitule: 'Python', auto_eval: 1, hierarchie_eval: 4 }],
      })];
      const required = [{ intitule: 'Python', niveau_min: 3 }];

      const result = await service.matchCompetences(employees, required, 'expertise');
      expect(result[0].details[0].employee_level).toBe(4);
      expect(result[0].details[0].meets_minimum).toBe(true);
    });
  });
});
