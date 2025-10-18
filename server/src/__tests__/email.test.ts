import nodemailer from 'nodemailer';

// Mock nodemailer BEFORE importing email service
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

import { sendPasswordResetEmail } from '../services/email';

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

});
