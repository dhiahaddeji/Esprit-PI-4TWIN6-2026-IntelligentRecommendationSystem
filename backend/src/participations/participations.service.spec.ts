import { Test, TestingModule } from '@nestjs/testing';
import { ParticipationsService } from './participations.service';
import { getModelToken } from '@nestjs/mongoose';
import { Participation } from './participation.schema';
import { Activity } from '../activity/activity.schema';

const makeParticipation = (overrides: any = {}) => ({
  _id: 'part-id-1',
  activityId: 'act-id-1',
  employeeId: 'emp-id-1',
  status: 'PENDING',
  ...overrides,
});

const makeActivity = (overrides: any = {}) => ({
  _id: 'act-id-1',
  title: 'Formation',
  type: 'formation',
  ...overrides,
});

describe('ParticipationsService', () => {
  let service: ParticipationsService;
  let participationModel: any;
  let activityModel: any;

  beforeEach(async () => {
    participationModel = {
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
    };

    activityModel = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipationsService,
        { provide: getModelToken(Participation.name), useValue: participationModel },
        { provide: getModelToken(Activity.name), useValue: activityModel },
      ],
    }).compile();

    service = module.get<ParticipationsService>(ParticipationsService);
    jest.clearAllMocks();
  });

  // ── upsert ────────────────────────────────────────────────────────────

  describe('upsert', () => {
    it('upserts participation by activityId + employeeId', async () => {
      const part = makeParticipation();
      participationModel.findOneAndUpdate.mockResolvedValue(part);

      const result = await service.upsert({
        activityId: 'act-id-1',
        employeeId: 'emp-id-1',
        status: 'PENDING',
      } as any);

      expect(result).toBe(part);
      expect(participationModel.findOneAndUpdate).toHaveBeenCalledWith(
        { activityId: 'act-id-1', employeeId: 'emp-id-1' },
        expect.objectContaining({ activityId: 'act-id-1', employeeId: 'emp-id-1' }),
        { upsert: true, returnDocument: 'after' },
      );
    });
  });

  // ── listForEmployee ───────────────────────────────────────────────────

  describe('listForEmployee', () => {
    it('returns empty when employee has no participations', async () => {
      participationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      });

      const result = await service.listForEmployee('emp-id-1');
      expect(result).toEqual([]);
      expect(activityModel.find).not.toHaveBeenCalled();
    });

    it('enriches participations with activity data', async () => {
      const participations = [makeParticipation({ activityId: 'act-id-1' })];
      const activities = [makeActivity({ _id: 'act-id-1' })];

      participationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(participations),
        }),
      });
      activityModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(activities),
        }),
      });

      const result = await service.listForEmployee('emp-id-1');
      expect(result).toHaveLength(1);
      expect((result[0] as any).activity).toBeDefined();
      expect((result[0] as any).activity.title).toBe('Formation');
    });

    it('sets activity to null when activityId not found', async () => {
      const participations = [makeParticipation({ activityId: 'act-unknown' })];
      participationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(participations),
        }),
      });
      activityModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.listForEmployee('emp-id-1');
      expect((result[0] as any).activity).toBeNull();
    });
  });
});
