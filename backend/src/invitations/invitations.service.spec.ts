import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsService } from './invitations.service';
import { getModelToken } from '@nestjs/mongoose';
import { Invitation } from './invitation.schema';

const makeInvitation = (overrides: any = {}) => ({
  _id: 'inv-id-1',
  activityId: 'activity-id-1',
  employeeId: 'emp-id-1',
  status: 'PENDING',
  justification: '',
  createdAt: new Date(),
  ...overrides,
});

describe('InvitationsService', () => {
  let service: InvitationsService;
  let invitationModel: any;

  beforeEach(async () => {
    invitationModel = {
      insertMany: jest.fn(),
      deleteMany: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: getModelToken(Invitation.name),
          useValue: invitationModel,
        },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    jest.clearAllMocks();
  });

  // ── bulkCreate ────────────────────────────────────────────────────────

  describe('bulkCreate', () => {
    it('inserts one invitation per employee', async () => {
      const docs = [makeInvitation(), makeInvitation({ employeeId: 'emp-id-2' })];
      invitationModel.insertMany.mockResolvedValue(docs);

      const result = await service.bulkCreate('activity-id-1', ['emp-id-1', 'emp-id-2']);

      expect(invitationModel.insertMany).toHaveBeenCalledWith(
        [
          expect.objectContaining({ activityId: 'activity-id-1', employeeId: 'emp-id-1', status: 'PENDING' }),
          expect.objectContaining({ activityId: 'activity-id-1', employeeId: 'emp-id-2', status: 'PENDING' }),
        ],
        { ordered: false },
      );
      expect(result).toBe(docs);
    });

    it('calls insertMany with empty array when no employees', async () => {
      invitationModel.insertMany.mockResolvedValue([]);
      await service.bulkCreate('activity-id-1', []);
      expect(invitationModel.insertMany).toHaveBeenCalledWith([], { ordered: false });
    });
  });

  // ── bulkUpsert ────────────────────────────────────────────────────────

  describe('bulkUpsert', () => {
    it('deletes pending then inserts new invitations', async () => {
      invitationModel.deleteMany.mockResolvedValue({ deletedCount: 2 });
      invitationModel.insertMany.mockResolvedValue([makeInvitation()]);

      const result = await service.bulkUpsert('activity-id-1', ['emp-id-1']);

      expect(invitationModel.deleteMany).toHaveBeenCalledWith({
        activityId: 'activity-id-1',
        status: 'PENDING',
      });
      expect(invitationModel.insertMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('returns empty array when employee list is empty', async () => {
      invitationModel.deleteMany.mockResolvedValue({ deletedCount: 0 });

      const result = await service.bulkUpsert('activity-id-1', []);
      expect(invitationModel.insertMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  // ── listForEmployee ───────────────────────────────────────────────────

  describe('listForEmployee', () => {
    it('returns invitations for a given employee sorted by date', async () => {
      const invitations = [makeInvitation()];
      const sortMock = jest.fn().mockResolvedValue(invitations);
      invitationModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.listForEmployee('emp-id-1');

      expect(result).toBe(invitations);
      expect(invitationModel.find).toHaveBeenCalledWith({ employeeId: 'emp-id-1' });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  // ── findById ──────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns invitation by id', async () => {
      const invitation = makeInvitation();
      invitationModel.findById.mockResolvedValue(invitation);

      const result = await service.findById('inv-id-1');
      expect(result).toBe(invitation);
    });

    it('returns null when not found', async () => {
      invitationModel.findById.mockResolvedValue(null);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ── respond ───────────────────────────────────────────────────────────

  describe('respond', () => {
    it('updates status to ACCEPTED and clears justification', async () => {
      const updated = makeInvitation({ status: 'ACCEPTED' });
      invitationModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.respond('inv-id-1', 'ACCEPTED');

      expect(result).toBe(updated);
      expect(invitationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'inv-id-1',
        expect.objectContaining({ status: 'ACCEPTED', justification: '' }),
        { returnDocument: 'after' },
      );
    });

    it('stores justification when status is DECLINED', async () => {
      const updated = makeInvitation({ status: 'DECLINED', justification: 'Unable to attend' });
      invitationModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.respond('inv-id-1', 'DECLINED', 'Unable to attend');

      expect(invitationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'inv-id-1',
        expect.objectContaining({ status: 'DECLINED', justification: 'Unable to attend' }),
        { returnDocument: 'after' },
      );
      expect(result).toBe(updated);
    });

    it('stores empty justification when DECLINED without reason', async () => {
      const updated = makeInvitation({ status: 'DECLINED', justification: '' });
      invitationModel.findByIdAndUpdate.mockResolvedValue(updated);

      await service.respond('inv-id-1', 'DECLINED');

      expect(invitationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'inv-id-1',
        expect.objectContaining({ justification: '' }),
        expect.any(Object),
      );
    });
  });

  // ── listByActivity ────────────────────────────────────────────────────

  describe('listByActivity', () => {
    it('returns all invitations for an activity', async () => {
      const invitations = [makeInvitation(), makeInvitation({ employeeId: 'emp-id-2' })];
      invitationModel.find.mockResolvedValue(invitations);

      const result = await service.listByActivity('activity-id-1');
      expect(result).toBe(invitations);
      expect(invitationModel.find).toHaveBeenCalledWith({ activityId: 'activity-id-1' });
    });
  });

  // ── listAccepted ──────────────────────────────────────────────────────

  describe('listAccepted', () => {
    it('returns only accepted invitations', async () => {
      const accepted = [makeInvitation({ status: 'ACCEPTED' })];
      invitationModel.find.mockResolvedValue(accepted);

      const result = await service.listAccepted();
      expect(result).toBe(accepted);
      expect(invitationModel.find).toHaveBeenCalledWith({ status: 'ACCEPTED' });
    });
  });
});
