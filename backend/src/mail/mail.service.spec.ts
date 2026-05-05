import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

const mockSendMail = jest.fn();
const mockVerify = jest.fn((cb: any) => cb(null));

beforeEach(() => {
  (nodemailer.createTransport as jest.Mock).mockReturnValue({
    sendMail: mockSendMail,
    verify: mockVerify,
  });
});

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = module.get<MailService>(MailService);
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });
  });

  // ── sendTestEmail ─────────────────────────────────────────────────────

  describe('sendTestEmail', () => {
    it('sends test email and returns success', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-1' });
      const result = await service.sendTestEmail('user@test.com');
      expect(result).toEqual({ success: true });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'user@test.com' }),
      );
    });

    it('returns error object when sendMail throws', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP error'));
      const result = await service.sendTestEmail('user@test.com');
      expect(result).toEqual({ success: false, error: 'SMTP error' });
    });
  });

  // ── sendWelcomeWithCredentials ─────────────────────────────────────────

  describe('sendWelcomeWithCredentials', () => {
    it('sends welcome email with credentials', async () => {
      await service.sendWelcomeWithCredentials({
        to: 'alice@x.com',
        name: 'Alice',
        role: 'EMPLOYEE',
        password: 'TempPass123',
      });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'alice@x.com' }),
      );
    });

    it('does not throw when sendMail fails', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP down'));
      await expect(
        service.sendWelcomeWithCredentials({
          to: 'alice@x.com',
          name: 'Alice',
          role: 'HR',
          password: 'TempPass',
        }),
      ).resolves.not.toThrow();
    });

    it('maps HR role to correct label in email', async () => {
      await service.sendWelcomeWithCredentials({
        to: 'hr@x.com', name: 'Bob', role: 'HR', password: 'pw',
      });
      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain('Responsable RH');
    });

    it('maps MANAGER role to correct label in email', async () => {
      await service.sendWelcomeWithCredentials({
        to: 'mgr@x.com', name: 'Bob', role: 'MANAGER', password: 'pw',
      });
      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain('Manager');
    });
  });

  // ── sendPasswordResetEmail ─────────────────────────────────────────────

  describe('sendPasswordResetEmail', () => {
    it('sends password reset email', async () => {
      await service.sendPasswordResetEmail({
        to: 'alice@x.com',
        name: 'Alice',
        resetUrl: 'http://localhost/reset?token=abc',
        expiresInMinutes: 30,
      });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'alice@x.com' }),
      );
    });

    it('does not throw when sendMail fails', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP down'));
      await expect(
        service.sendPasswordResetEmail({
          to: 'alice@x.com', name: 'Alice',
          resetUrl: 'http://x/reset', expiresInMinutes: 15,
        }),
      ).resolves.not.toThrow();
    });
  });

  // ── sendAccountSuspendedEmail ──────────────────────────────────────────

  describe('sendAccountSuspendedEmail', () => {
    it('sends account suspended email', async () => {
      await service.sendAccountSuspendedEmail({
        to: 'alice@x.com',
        name: 'Alice',
        reason: 'Policy violation',
      });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'alice@x.com' }),
      );
    });

    it('sends without reason when not provided', async () => {
      await service.sendAccountSuspendedEmail({ to: 'alice@x.com', name: 'Alice' });
      expect(mockSendMail).toHaveBeenCalled();
    });

    it('does not throw when sendMail fails', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP down'));
      await expect(
        service.sendAccountSuspendedEmail({ to: 'alice@x.com', name: 'Alice' }),
      ).resolves.not.toThrow();
    });
  });
});
