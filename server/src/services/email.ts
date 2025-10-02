import nodemailer from 'nodemailer';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPasswordResetEmail = async (
  to: string,
  resetToken: string
) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"LedgerSplit" <noreply@ledgersplit.com>',
    to,
    subject: 'Reset Your Password - LedgerSplit',
    html: `
      <h2>Reset Your Password</h2>
      <p>You requested to reset your password. Click the link below to proceed:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  });
};

export const sendFriendInviteEmail = async (
  to: string,
  inviterName: string,
  inviteToken: string
) => {
  const inviteUrl = `${process.env.CLIENT_URL}/accept-invite?token=${inviteToken}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"LedgerSplit" <noreply@ledgersplit.com>',
    to,
    subject: `${inviterName} invited you to LedgerSplit`,
    html: `
      <h2>You've been invited to LedgerSplit!</h2>
      <p><strong>${inviterName}</strong> invited you to join LedgerSplit to split expenses together.</p>
      <p><a href="${inviteUrl}">Accept Invitation</a></p>
      <p>If you already have an account, log in and accept the friend request.</p>
    `,
  });
};

export const sendEventInviteEmail = async (
  to: string,
  inviterName: string,
  eventName: string,
  inviteToken: string
) => {
  const inviteUrl = `${process.env.CLIENT_URL}/accept-invite?token=${inviteToken}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"LedgerSplit" <noreply@ledgersplit.com>',
    to,
    subject: `${inviterName} invited you to join ${eventName}`,
    html: `
      <h2>You've been invited to join an event!</h2>
      <p><strong>${inviterName}</strong> invited you to join the event <strong>${eventName}</strong> on LedgerSplit.</p>
      <p><a href="${inviteUrl}">Accept Invitation</a></p>
      <p>If you don't have an account, you'll be able to sign up and automatically join this event.</p>
    `,
  });
};
