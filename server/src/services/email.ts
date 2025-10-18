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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: #bcd4de; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; color: #000000; font-size: 24px; }
          .content { padding: 30px 20px; }
          a { color: #000000; }
          .button { display: inline-block; padding: 12px 30px; background: #a5ccd1; color: #000000 !important; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LedgerSplit</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            <p>For security reasons, this link can only be used once.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} LedgerSplit. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
};

// Unused - friend invites not implemented
// export const sendFriendInviteEmail = async (...) => { ... }

// Unused - event invites use share links instead
// export const sendEventInviteEmail = async (...) => { ... }
