import { Response } from 'express';
import bcrypt from 'bcrypt';
import { googleClient } from '../config/google';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Helper function to auto-accept pending email invites
const autoAcceptPendingInvites = async (userId: string, userEmail: string) => {
  try {
    // Find all pending invites for this email
    const { data: pendingInvites } = await db
      .from('event_invites')
      .select('*')
      .eq('invited_email', userEmail.toLowerCase())
      .eq('status', 'pending');

    if (!pendingInvites || pendingInvites.length === 0) {
      return;
    }

    // Process each invite
    for (const invite of pendingInvites) {
      try {
        // Update invite to link to user and mark as accepted
        await db
          .from('event_invites')
          .update({
            invited_user: userId,
            status: 'accepted',
            responded_at: new Date().toISOString(),
          })
          .eq('invite_id', invite.invite_id);

        // Add user to event
        await db
          .from('event_participants')
          .insert({
            event_id: invite.event_id,
            user_id: userId,
          });

        // Get all existing splits in this event
        const { data: splits } = await db
          .from('splits')
          .select('split_id, amount')
          .eq('event_id', invite.event_id)
          .is('deleted_at', null);

        // Add user to all existing splits
        if (splits && splits.length > 0) {
          for (const split of splits) {
            // Get current split participants to recalculate amount_owed
            const { data: currentParticipants } = await db
              .from('split_participants')
              .select('user_id')
              .eq('split_id', split.split_id);

            const totalParticipants = (currentParticipants?.length || 0) + 1;
            const newAmountOwed = split.amount / totalParticipants;

            // Update existing participants' amount_owed
            if (currentParticipants && currentParticipants.length > 0) {
              for (const participant of currentParticipants) {
                await db
                  .from('split_participants')
                  .update({ amount_owed: newAmountOwed })
                  .eq('split_id', split.split_id)
                  .eq('user_id', participant.user_id);
              }
            }

            // Add new participant
            await db
              .from('split_participants')
              .insert({
                split_id: split.split_id,
                user_id: userId,
                amount_owed: newAmountOwed,
              });
          }
        }
      } catch (error) {
        console.error(`Failed to auto-accept invite ${invite.invite_id}:`, error);
        // Continue processing other invites even if one fails
      }
    }
  } catch (error) {
    console.error('Error in autoAcceptPendingInvites:', error);
    // Don't throw - this is a background operation
  }
};

// Register with email/password
export const register = async (req: AuthRequest, res: Response) => {
  const { email, password, name } = req.body;

  try {
    // Check if user already exists
    const { data: existingUser } = await db
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await db
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name,
        email_verified: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Set session
    req.session.user = {
      id: user.user_id,
      email: user.email,
      name: user.name,
    };

    // Auto-accept any pending email invites
    await autoAcceptPendingInvites(user.user_id, user.email);

    res.status(201).json({
      message: 'User created successfully',
      user: req.session.user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login with email/password
export const login = async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  try {
    // Find user
    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user registered with Google
    if (!user.password_hash) {
      return res.status(400).json({ error: 'Please login with Google' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set session
    req.session.user = {
      id: user.user_id,
      email: user.email,
      name: user.name,
    };

    res.json({
      message: 'Login successful',
      user: req.session.user,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Google OAuth URL
export const getGoogleAuthUrl = (req: AuthRequest, res: Response) => {
  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
  res.json({ url });
};

// Google OAuth callback
export const handleGoogleCallback = async (req: AuthRequest, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Authorization code missing' });
  }

  try {
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ error: 'Failed to get user info' });
    }

    // Upsert user in database
    const { data: user, error } = await db
      .from('users')
      .upsert(
        {
          email: payload.email,
          name: payload.name,
          google_id: payload.sub,
          email_verified: true,
          avatar_url: payload.picture,
        },
        { onConflict: 'google_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Set session
    req.session.user = {
      id: user.user_id,
      email: user.email,
      name: user.name,
      google_id: user.google_id,
    };

    // Auto-accept any pending email invites
    await autoAcceptPendingInvites(user.user_id, user.email);

    // Save session before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Session error' });
      }

      // Redirect to client with success
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientUrl}/dashboard`);
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Get current user
export const getCurrentUser = (req: AuthRequest, res: Response) => {
  res.json({ user: req.session.user || null });
};

// Logout
export const logout = (req: AuthRequest, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
};

// Request password reset
export const requestPasswordReset = async (req: AuthRequest, res: Response) => {
  const { email } = req.body;

  try {
    // Find user
    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    // Always return success to prevent email enumeration
    if (error || !user) {
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    // Don't allow password reset for Google auth users
    if (user.google_id && !user.password_hash) {
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    // Create reset token
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    const { data: token, error: tokenError } = await db
      .from('password_reset_tokens')
      .insert({
        user_id: user.user_id,
        expires_at: expiresAt.toISOString(),
        used: false,
      })
      .select()
      .single();

    if (tokenError) {
      console.error('Token error:', tokenError);
      return res.status(500).json({ error: 'Failed to create reset token' });
    }

    // Send email
    const { sendPasswordResetEmail } = await import('../services/email');
    await sendPasswordResetEmail(email, token.token);

    res.json({ message: 'If that email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// Reset password with token
export const resetPassword = async (req: AuthRequest, res: Response) => {
  const { token, newPassword } = req.body;

  try {
    // Find valid token
    const { data: resetToken, error: tokenError } = await db
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    const { error: updateError } = await db
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('user_id', resetToken.user_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    // Mark token as used
    await db
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Request password change (requires email confirmation)
export const requestPasswordChange = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    // Get user email
    const { data: user, error } = await db
      .from('users')
      .select('email, google_id')
      .eq('user_id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow password change for Google-only accounts
    if (user.google_id) {
      return res.status(400).json({ error: 'Google accounts cannot change password this way' });
    }

    // Create reset token
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    const { data: token, error: tokenError } = await db
      .from('password_reset_tokens')
      .insert({
        user_id: userId,
        expires_at: expiresAt.toISOString(),
        used: false,
      })
      .select()
      .single();

    if (tokenError) {
      console.error('Token error:', tokenError);
      return res.status(500).json({ error: 'Failed to create reset token' });
    }

    // Send email
    const { sendPasswordResetEmail } = await import('../services/email');
    await sendPasswordResetEmail(user.email, token.token);

    res.json({ message: 'Password change link sent to your email' });
  } catch (error) {
    console.error('Password change request error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// Delete account
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    // Soft delete user
    const { error } = await db
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};