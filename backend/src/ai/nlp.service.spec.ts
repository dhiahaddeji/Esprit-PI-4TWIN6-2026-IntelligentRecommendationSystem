import { Test, TestingModule } from '@nestjs/testing';
import { NlpService } from './nlp.service';

describe('NlpService', () => {
  let service: NlpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NlpService],
    }).compile();
    service = module.get<NlpService>(NlpService);
  });

  // ── normalize ─────────────────────────────────────────────────────────

  describe('normalize', () => {
    it('resolves known alias to canonical name', () => {
      expect(service.normalize('js')).toBe('JavaScript');
      expect(service.normalize('python')).toBe('Python');
      expect(service.normalize('ml')).toBe('Machine Learning');
      expect(service.normalize('k8s')).toBe('Kubernetes');
      expect(service.normalize('ts')).toBe('TypeScript');
    });

    it('resolves prefix alias', () => {
      expect(service.normalize('react developer')).toBe('React');
    });

    it('title-cases unknown skills', () => {
      expect(service.normalize('some unknown skill')).toBe('Some Unknown Skill');
    });

    it('handles already canonical names', () => {
      expect(service.normalize('Docker')).toBe('Docker');
    });

    it('handles empty-ish strings gracefully', () => {
      const result = service.normalize('  python  ');
      expect(result).toBe('Python');
    });
  });

  // ── deduplicate ───────────────────────────────────────────────────────

  describe('deduplicate', () => {
    it('removes duplicate skills by normalized name', () => {
      const skills = [
        { intitule: 'python', type: 'savoir', auto_eval: 2, confidence: 80 },
        { intitule: 'Python', type: 'savoir', auto_eval: 3, confidence: 90 },
        { intitule: 'js', type: 'savoir', auto_eval: 2, confidence: 70 },
      ];
      const result = service.deduplicate(skills);
      expect(result).toHaveLength(2);
      expect(result.map(s => s.intitule)).toContain('Python');
      expect(result.map(s => s.intitule)).toContain('JavaScript');
    });

    it('keeps first occurrence', () => {
      const skills = [
        { intitule: 'Docker', type: 'savoir', auto_eval: 2, confidence: 80 },
        { intitule: 'docker', type: 'savoir', auto_eval: 4, confidence: 95 },
      ];
      const result = service.deduplicate(skills);
      expect(result).toHaveLength(1);
      expect(result[0].auto_eval).toBe(2);
    });

    it('returns empty array for empty input', () => {
      expect(service.deduplicate([])).toEqual([]);
    });
  });

  // ── extractExperience ─────────────────────────────────────────────────

  describe('extractExperience', () => {
    it('extracts years from "5 ans de Python" pattern', () => {
      // Pattern: "X ans de skill" — the regex captures skill after "de"
      const result = service.extractExperience('5 ans de python');
      // The key is the normalized form of "python"
      const hasEntry = Object.values(result).some(v => v === 5) || result['python'] === 5;
      expect(hasEntry).toBe(true);
    });

    it('extracts years from "Python: 3 ans" pattern', () => {
      const result = service.extractExperience('python: 3 ans');
      expect(result['python']).toBe(3);
    });

    it('returns empty object for text with no experience patterns', () => {
      const result = service.extractExperience('je suis développeur');
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('keeps maximum years when skill appears multiple times', () => {
      const result = service.extractExperience('python: 2 ans\npython: 5 ans');
      expect(result['python']).toBe(5);
    });

    it('ignores unrealistic years (> 40)', () => {
      const result = service.extractExperience('python: 50 ans');
      expect(result['python']).toBeUndefined();
    });
  });

  // ── semanticSimilarity ────────────────────────────────────────────────

  describe('semanticSimilarity', () => {
    it('returns 1.0 for identical strings', () => {
      expect(service.semanticSimilarity('Python', 'Python')).toBe(1.0);
    });

    it('returns high similarity when one string contains the other', () => {
      // After normalization, "Python developer" → "Python Developer" and "Python" → "Python"
      // The normalized form may or may not trigger the contains check depending on alias resolution
      const sim = service.semanticSimilarity('Python developer', 'Python');
      expect(sim).toBeGreaterThanOrEqual(0.8);
    });

    it('returns high similarity for very similar strings', () => {
      const sim = service.semanticSimilarity('JavaScript', 'javascript');
      expect(sim).toBeGreaterThan(0.8);
    });

    it('returns low similarity for unrelated strings', () => {
      const sim = service.semanticSimilarity('Python', 'Comptabilité');
      expect(sim).toBeLessThan(0.5);
    });

    it('handles alias normalization before comparison', () => {
      const sim = service.semanticSimilarity('js', 'JavaScript');
      expect(sim).toBe(1.0);
    });
  });

  // ── cosineSimilarity ──────────────────────────────────────────────────

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      expect(service.cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1.0);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(service.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
    });

    it('handles zero vectors without crashing', () => {
      const result = service.cosineSimilarity([0, 0], [0, 0]);
      expect(result).toBeDefined();
    });
  });
});
