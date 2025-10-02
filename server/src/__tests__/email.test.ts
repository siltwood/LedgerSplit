import nodemailer from 'nodemailer';

// Mock nodemailer BEFORE importing email service
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

import { sendPasswordResetEmail, sendFriendInviteEmail, sendEventInviteEmail } from '../services/email';

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct details', async () => {
      const to = 'user@example.com';
      const resetToken = 'test-token-123';

      await sendPasswordResetEmail(to, resetToken);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject: expect.stringContaining('Reset Your Password'),
          html: expect.stringContaining(resetToken),
        })
      );

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Reset Password');
      expect(callArgs.html).toContain('expire in 1 hour');
    });

    it('should include reset URL with token', async () => {
      const to = 'user@example.com';
      const resetToken = 'test-token-123';

      await sendPasswordResetEmail(to, resetToken);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(`token=${resetToken}`);
    });
  });

  describe('sendFriendInviteEmail', () => {
    it('should send friend invite email with correct details', async () => {
      const to = 'friend@example.com';
      const inviterName = 'John Doe';
      const inviteToken = 'invite-token-123';

      await sendFriendInviteEmail(to, inviterName, inviteToken);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject: expect.stringContaining(inviterName),
          html: expect.stringContaining(inviterName),
        })
      );

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('LedgerSplit');
      expect(callArgs.html).toContain(inviteToken);
    });

    it('should include invite URL with token', async () => {
      const to = 'friend@example.com';
      const inviterName = 'John Doe';
      const inviteToken = 'invite-token-123';

      await sendFriendInviteEmail(to, inviterName, inviteToken);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(`token=${inviteToken}`);
      expect(callArgs.html).toContain('Accept Invitation');
    });
  });

  describe('sendEventInviteEmail', () => {
    it('should send event invite email with correct details', async () => {
      const to = 'friend@example.com';
      const inviterName = 'Jane Doe';
      const eventName = 'Vegas Trip';
      const inviteToken = 'event-token-123';

      await sendEventInviteEmail(to, inviterName, eventName, inviteToken);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe(to);
      expect(callArgs.subject).toContain(inviterName);
      expect(callArgs.subject).toContain(eventName);
      expect(callArgs.html).toContain(inviterName);
      expect(callArgs.html).toContain(eventName);
    });

    it('should include invite URL with token', async () => {
      const to = 'friend@example.com';
      const inviterName = 'Jane Doe';
      const eventName = 'Vegas Trip';
      const inviteToken = 'event-token-123';

      await sendEventInviteEmail(to, inviterName, eventName, inviteToken);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(`token=${inviteToken}`);
      expect(callArgs.html).toContain('Accept Invitation');
    });

    it('should mention signup auto-join feature', async () => {
      const to = 'friend@example.com';
      const inviterName = 'Jane Doe';
      const eventName = 'Vegas Trip';
      const inviteToken = 'event-token-123';

      await sendEventInviteEmail(to, inviterName, eventName, inviteToken);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('sign up');
      expect(callArgs.html).toContain('automatically be added');
    });
  });

});
