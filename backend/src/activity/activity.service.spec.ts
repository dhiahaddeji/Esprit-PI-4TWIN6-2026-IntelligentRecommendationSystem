import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesService } from './activity.service';
import { getModelToken } from '@nestjs/mongoose';
import { Activity } from './activity.schema';

const makeActivity = (overrides: any = {}) => ({
  _id: 'activity-id-1',
  title: 'Formation React',
  type: 'formation',
  status: 'DRAFT',
  competences_requises: [],
  participants: [],
  createdAt: new Date(),
  ...overrides,
});


describe('ActivitiesService', () => {
  let service: ActivitiesService;
  let activityModel: any;

  beforeEach(async () => {
    activityModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: getModelToken(Activity.name),
          useValue: activityModel,
        },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates and returns a new activity', async () => {
      const activity = makeActivity();
      activityModel.create.mockResolvedValue(activity);
      const result = await service.create({ title: 'Formation React', type: 'formation' } as any);
      expect(result).toBe(activity);
      expect(activityModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Formation React' }),
      );
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns sorted activities', async () => {
      const activities = [makeActivity(), makeActivity({ _id: 'activity-id-2' })];
      // findAll() does .find().sort() — sort() must be a thenable
      activityModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(activities),
      });
      const result = await service.findAll();
      expect(result).toEqual(activities);
      expect(activityModel.find).toHaveBeenCalled();
    });
  });

  // ── findById ──────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns an activity by id', async () => {
      const activity = makeActivity();
      activityModel.findById.mockResolvedValue(activity);
      const result = await service.findById('activity-id-1');
      expect(result).toBe(activity);
      expect(activityModel.findById).toHaveBeenCalledWith('activity-id-1');
    });

    it('returns null when not found', async () => {
      activityModel.findById.mockResolvedValue(null);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ── update ────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates and returns the activity', async () => {
      const updated = makeActivity({ status: 'SENT_TO_MANAGER' });
      activityModel.findByIdAndUpdate.mockResolvedValue(updated);
      const result = await service.update('activity-id-1', { status: 'SENT_TO_MANAGER' } as any);
      expect(result).toBe(updated);
      expect(activityModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'activity-id-1',
        { status: 'SENT_TO_MANAGER' },
        { returnDocument: 'after' },
      );
    });
  });

  // ── listPaginated ─────────────────────────────────────────────────────

  describe('listPaginated', () => {
    it('returns paginated data with total count', async () => {
      const activities = [makeActivity()];
      const sortMock = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(activities) }),
      });
      activityModel.find.mockReturnValue({ sort: sortMock });
      activityModel.countDocuments.mockResolvedValue(1);

      const result = await service.listPaginated(1, 20);

      expect(result).toMatchObject({ data: activities, total: 1, page: 1, limit: 20 });
    });

    it('uses default page 1 and limit 20 when not provided', async () => {
      const sortMock = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
      });
      activityModel.find.mockReturnValue({ sort: sortMock });
      activityModel.countDocuments.mockResolvedValue(0);

      const result = await service.listPaginated();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('caps limit at 200', async () => {
      const sortMock = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
      });
      activityModel.find.mockReturnValue({ sort: sortMock });
      activityModel.countDocuments.mockResolvedValue(0);

      const result = await service.listPaginated(1, 9999);
      expect(result.limit).toBe(200);
    });
  });
});
