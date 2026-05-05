import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service';
import { getModelToken } from '@nestjs/mongoose';
import { Recommendation } from './recommendation.schema';
import { Activity } from '../activity/activity.schema';

const makeRecommendation = (overrides: any = {}) => ({
  activityId: 'activity-id-1',
  list: [{ employeeId: 'emp-1', score: 0.9 }],
  hrValidated: false,
  refusedEmployees: [],
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeActivity = (overrides: any = {}) => ({
  _id: 'activity-id-1',
  title: 'Formation React',
  status: 'DRAFT',
  participants: [],
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let recommendationModel: any;
  let activityModel: any;

  beforeEach(async () => {
    recommendationModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    activityModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: getModelToken(Recommendation.name),
          useValue: recommendationModel,
        },
        {
          provide: getModelToken(Activity.name),
          useValue: activityModel,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    jest.clearAllMocks();
  });

  // ── getByActivity ─────────────────────────────────────────────────────

  describe('getByActivity', () => {
    it('returns recommendation when found', async () => {
      const rec = makeRecommendation();
      recommendationModel.findOne.mockResolvedValue(rec);

      const result = await service.getByActivity('activity-id-1');
      expect(result).toBe(rec);
      expect(recommendationModel.findOne).toHaveBeenCalledWith({
        activityId: 'activity-id-1',
      });
    });

    it('returns null when no recommendation found', async () => {
      recommendationModel.findOne.mockResolvedValue(null);
      const result = await service.getByActivity('unknown');
      expect(result).toBeNull();
    });
  });

  // ── upsert ────────────────────────────────────────────────────────────

  describe('upsert', () => {
    it('upserts recommendation with hrValidated=false by default', async () => {
      const rec = makeRecommendation();
      recommendationModel.findOneAndUpdate.mockResolvedValue(rec);

      const list = [{ employeeId: 'emp-1', score: 0.9 }];
      const result = await service.upsert('activity-id-1', list);

      expect(result).toBe(rec);
      expect(recommendationModel.findOneAndUpdate).toHaveBeenCalledWith(
        { activityId: 'activity-id-1' },
        expect.objectContaining({ activityId: 'activity-id-1', list, hrValidated: false }),
        { returnDocument: 'after', upsert: true },
      );
    });

    it('includes refusedEmployees when provided', async () => {
      const rec = makeRecommendation();
      recommendationModel.findOneAndUpdate.mockResolvedValue(rec);

      await service.upsert('activity-id-1', [], false, ['emp-2']);

      expect(recommendationModel.findOneAndUpdate).toHaveBeenCalledWith(
        { activityId: 'activity-id-1' },
        expect.objectContaining({ refusedEmployees: ['emp-2'] }),
        expect.any(Object),
      );
    });
  });

  // ── validate ──────────────────────────────────────────────────────────

  describe('validate', () => {
    it('throws when recommendation not found', async () => {
      recommendationModel.findOne.mockResolvedValue(null);
      await expect(service.validate('activity-id-1')).rejects.toThrow('Recommendation not found');
    });

    it('throws when activity not found', async () => {
      recommendationModel.findOne.mockResolvedValue(makeRecommendation());
      activityModel.findById.mockResolvedValue(null);
      await expect(service.validate('activity-id-1')).rejects.toThrow('Activity not found');
    });

    it('validates recommendation, updates activity status and participants', async () => {
      const rec = makeRecommendation({ list: [{ employeeId: 'emp-1' }, { employeeId: 'emp-2' }] });
      const activity = makeActivity();

      recommendationModel.findOne.mockResolvedValue(rec);
      activityModel.findById.mockResolvedValue(activity);

      const result = await service.validate('activity-id-1');

      expect(activity.status).toBe('SENT_TO_MANAGER');
      expect(activity.participants).toEqual(['emp-1', 'emp-2']);
      expect(activity.save).toHaveBeenCalled();
      expect(rec.hrValidated).toBe(true);
      expect(rec.save).toHaveBeenCalled();
      expect(result).toMatchObject({
        message: expect.stringContaining('validated'),
      });
    });
  });
});
