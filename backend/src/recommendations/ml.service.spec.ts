import { Test, TestingModule } from '@nestjs/testing';
import { MlService } from './ml.service';

const makeFetchMock = (data: any, ok = true, status = 200) => {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  });
};

describe('MlService', () => {
  let service: MlService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MlService],
    }).compile();

    service = module.get<MlService>(MlService);
    fetchSpy = jest.spyOn(global, 'fetch' as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // ── recommend ─────────────────────────────────────────────────────────

  describe('recommend', () => {
    it('returns ranked results from ML service', async () => {
      const results = [{ employee_id: 'emp-1', score: 85 }];
      fetchSpy.mockImplementation(makeFetchMock({ results }));

      const employees = [{ employee_id: 'emp-1', employee_name: 'Alice', competences: [] }];
      const activity = { _id: 'act-1', type: 'formation', seats: 5, competences_requises: [] };

      const result = await service.recommend(employees, activity);
      expect(result).toBe(results);
    });

    it('returns null when ML service returns no results array', async () => {
      fetchSpy.mockImplementation(makeFetchMock({ error: 'no results' }));
      const result = await service.recommend([], { _id: 'a1' });
      expect(result).toBeNull();
    });

    it('returns null when fetch throws (service unavailable)', async () => {
      fetchSpy.mockImplementation(() => Promise.reject(new Error('Connection refused')));
      const result = await service.recommend([], { _id: 'a1' });
      expect(result).toBeNull();
    });

    it('returns null when response is not ok', async () => {
      fetchSpy.mockImplementation(makeFetchMock({ error: 'bad request' }, false, 422));
      const result = await service.recommend([], { _id: 'a1' });
      expect(result).toBeNull();
    });

    it('maps employee competences correctly', async () => {
      fetchSpy.mockImplementation(makeFetchMock({ results: [] }));

      const employees = [{
        employee_id: 'emp-1',
        employee_name: 'Alice',
        years_experience: 5,
        competences: [{ intitule: 'Python', type: 'savoir', auto_eval: 3, hierarchie_eval: 3 }],
      }];

      await service.recommend(employees, { _id: 'a1', competences_requises: [] });

      const body = JSON.parse((fetchSpy.mock.calls[0][1] as any).body);
      expect(body.employees[0].competences[0].intitule).toBe('Python');
      expect(body.employees[0].years_experience).toBe(5);
    });
  });

  // ── updateScores ──────────────────────────────────────────────────────

  describe('updateScores', () => {
    it('returns updates from ML service', async () => {
      const response = { updates: [{ intitule: 'Python', new_score: 80 }], new_skills: [] };
      fetchSpy.mockImplementation(makeFetchMock(response));

      const result = await service.updateScores(
        'emp-1',
        [{ intitule: 'Python', auto_eval: 3, hierarchie_eval: 3 }],
        [{ intitule: 'Python', niveau_min: 3 }],
        'formation',
      );

      expect(result).toBe(response);
    });

    it('returns null when ML service is unavailable', async () => {
      fetchSpy.mockImplementation(() => Promise.reject(new Error('Network error')));
      const result = await service.updateScores('emp-1', [], [], 'formation');
      expect(result).toBeNull();
    });

    it('returns null when response is null', async () => {
      fetchSpy.mockImplementation(makeFetchMock(null));
      const result = await service.updateScores('emp-1', [], [], 'formation');
      expect(result).toBeNull();
    });
  });

  // ── sendFeedback ──────────────────────────────────────────────────────

  describe('sendFeedback', () => {
    it('does nothing when items array is empty', async () => {
      await service.sendFeedback([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('sends feedback items to ML service', async () => {
      fetchSpy.mockImplementation(makeFetchMock({ ok: true }));

      const items = [{ features: [1, 2, 3], label: 1 as const, activity_id: 'a1', employee_id: 'e1' }];
      await service.sendFeedback(items);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/feedback'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('does not throw when ML service is unavailable', async () => {
      fetchSpy.mockImplementation(() => Promise.reject(new Error('Timeout')));
      await expect(
        service.sendFeedback([{ features: [], label: 0, activity_id: 'a1', employee_id: 'e1' }]),
      ).resolves.not.toThrow();
    });
  });

  // ── isAvailable ───────────────────────────────────────────────────────

  describe('isAvailable', () => {
    it('returns true when ML service responds with ok', async () => {
      fetchSpy.mockImplementation(() => Promise.resolve({ ok: true }));
      const result = await service.isAvailable();
      expect(result).toBe(true);
    });

    it('returns false when ML service is unavailable', async () => {
      fetchSpy.mockImplementation(() => Promise.reject(new Error('Refused')));
      const result = await service.isAvailable();
      expect(result).toBe(false);
    });

    it('returns false when response is not ok', async () => {
      fetchSpy.mockImplementation(() => Promise.resolve({ ok: false }));
      const result = await service.isAvailable();
      expect(result).toBe(false);
    });
  });
});
