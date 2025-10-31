import { Response } from 'express';
import bcrypt from 'bcrypt';
import { googleClient } from '../config/google';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Register with email/password
export const register = async (req: AuthRequest, res: Response) => {
  const { email, password, name } = req.body;

  try {
    // Import validation utilities
    const { isValidEmail, validatePassword, validateName } = await import('../utils/validation');

    // Validate email
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Validate and sanitize name
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({ error: nameValidation.error });
    }

    // Check if user already exists
    const { data: existingUser } = await db
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await db
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: nameValidation.sanitized,
        email_verified: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to create user.' });
    }

    // Regenerate session to prevent fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ error: 'Session error.' });
      }

      // Set session
      req.session.user = {
        id: user.user_id,
        email: user.email,
        name: user.name,
        venmo_username: user.venmo_username,
      };

      // Save session before continuing
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
          return res.status(500).json({ error: 'Session error.' });
        }

        res.status(201).json({
          message: 'User created successfully',
          user: req.session.user,
        });
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
};

// Login with email/password
export const login = async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  try {
    // Import validation utilities
    const { isValidEmail } = await import('../utils/validation');

    // Validate email format
    if (!email || !isValidEmail(email)) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Find user
    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .is('deleted_at', null)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Check if user registered with Google
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Regenerate session to prevent fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ error: 'Session error.' });
      }

      // Set session
      req.session.user = {
        id: user.user_id,
        email: user.email,
        name: user.name,
        venmo_username: user.venmo_username,
      };

      // Save session
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
          return res.status(500).json({ error: 'Session error.' });
        }

        res.json({
          message: 'Login successful',
          user: req.session.user,
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
};

// Google OAuth URL
export const getGoogleAuthUrl = (req: AuthRequest, res: Response) => {
  // Generate state parameter to prevent CSRF
  const crypto = require('crypto');
  const state = crypto.randomBytes(32).toString('hex');

  // Store state with timestamp - allows reuse for 5 minutes
  req.session.oauthState = state;
  req.session.oauthStateCreated = Date.now();

  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state,
  });
  res.json({ url });
};

// Google OAuth callback
export const handleGoogleCallback = async (req: AuthRequest, res: Response) => {
  const { code, state } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Authorization code missing.' });
  }

  // Verify state parameter to prevent CSRF
  const stateCreatedAt = req.session.oauthStateCreated || 0;
  const fiveMinutes = 5 * 60 * 1000;
  const isStateExpired = Date.now() - stateCreatedAt > fiveMinutes;

  if (!state || state !== req.session.oauthState || isStateExpired) {
    // Clear expired state
    delete req.session.oauthState;
    delete req.session.oauthStateCreated;

    // Redirect to login with error message
    const redirectUrl = process.env.NODE_ENV === 'production'
      ? 'https://ledgersplit.com/login?error=oauth_expired'
      : 'http://localhost:5173/login?error=oauth_expired';
    return res.redirect(redirectUrl);
  }

  // Don't clear state yet - allow multiple attempts with the same state
  // State will expire after 5 minutes or when session ends

  try {
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ error: 'Failed to get user info.' });
    }

    // Check if user exists by email
    const { data: existingUserByEmail } = await db
      .from('users')
      .select('*')
      .eq('email', payload.email)
      .single();

    if (existingUserByEmail && !existingUserByEmail.google_id) {
      // Email already registered with password - redirect to login
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(`${clientUrl}/login?error=email_exists`);
    }

    // Check if user exists by google_id
    const { data: existingUserByGoogle } = await db
      .from('users')
      .select('*')
      .eq('google_id', payload.sub)
      .single();

    let user;
    if (existingUserByGoogle) {
      // User already exists with this Google account
      user = existingUserByGoogle;
    } else {
      // Create new user
      const { data: newUser, error: insertError } = await db
        .from('users')
        .insert({
          email: payload.email,
          name: payload.name,
          google_id: payload.sub,
          email_verified: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Supabase error:', insertError);
        return res.status(500).json({ error: 'Failed to create user.' });
      }
      user = newUser;
    }

    // Set session (no regeneration needed for OAuth - Google already validates)
    req.session.user = {
      id: user.user_id,
      email: user.email,
      name: user.name,
      google_id: user.google_id,
      venmo_username: user.venmo_username,
    };

    // Clear OAuth state after successful authentication
    delete req.session.oauthState;
    delete req.session.oauthStateCreated;

    // Save session before redirect
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('Session save error:', saveErr);
        return res.status(500).json({ error: 'Session error.' });
      }

      // Redirect to client with success
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientUrl}/dashboard`);
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
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
      return res.status(500).json({ error: 'Failed to logout.' });
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
      return res.status(500).json({ error: 'Failed to create reset token.' });
    }

    // Send email
    const { sendPasswordResetEmail } = await import('../services/email');
    await sendPasswordResetEmail(email, token.token);

    res.json({ message: 'If that email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process request.' });
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
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
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
      return res.status(500).json({ error: 'Failed to reset password.' });
    }

    // Mark token as used
    await db
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
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
      return res.status(404).json({ error: 'User not found.' });
    }

    // Don't allow password change for Google-only accounts
    if (user.google_id) {
      return res.status(400).json({ error: 'Google accounts cannot change password this way.' });
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
      return res.status(500).json({ error: 'Failed to create reset token.' });
    }

    // Send email
    const { sendPasswordResetEmail } = await import('../services/email');
    await sendPasswordResetEmail(user.email, token.token);

    res.json({ message: 'Password change link sent to your email' });
  } catch (error) {
    console.error('Password change request error:', error);
    res.status(500).json({ error: 'Failed to process request.' });
  }
};

// Delete account (soft delete)
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    // Soft delete user - keep their data for other users' records
    const { error } = await db
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        // Clear sensitive data
        password_hash: null,
        google_id: null,
        email: `deleted_${userId}@ledgersplit.com`,
        avatar_url: null
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: 'Failed to delete account.' });
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
    res.status(500).json({ error: 'Failed to delete account.' });
  }
};

// Update user profile
export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { venmo_username } = req.body;

  try {
    // Validate venmo_username (optional, alphanumeric, hyphens, underscores, max 50 chars)
    if (venmo_username && typeof venmo_username === 'string') {
      const trimmed = venmo_username.trim();
      if (trimmed.length > 50) {
        return res.status(400).json({ error: 'Venmo username must be 50 characters or less.' });
      }
      // Venmo usernames can contain letters, numbers, hyphens, and underscores
      if (trimmed && !/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return res.status(400).json({ error: 'Venmo username can only contain letters, numbers, hyphens, and underscores.' });
      }
    }

    // Update user
    const { data: user, error } = await db
      .from('users')
      .update({
        venmo_username: venmo_username?.trim() || null,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return res.status(500).json({ error: 'Failed to update profile.' });
    }

    // Update session
    if (req.session.user) {
      req.session.user.venmo_username = user.venmo_username;
    }

    res.json({ message: 'Profile updated successfully', user: req.session.user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

// Export user data (GDPR right to data portability)
export const exportUserData = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    // Get user profile
    const { data: user, error: userError } = await db
      .from('users')
      .select('user_id, email, name, venmo_username, created_at')
      .eq('user_id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Get events where user is a participant (excluding deleted events)
    const { data: eventParticipations, error: eventError } = await db
      .from('event_participants')
      .select(`
        events!inner (
          event_id,
          name,
          description,
          created_at,
          deleted_at
        )
      `)
      .eq('user_id', userId)
      .is('events.deleted_at', null);

    if (eventError) {
      console.error('Event export error:', eventError);
    }

    // Get all splits from events the user is participating in
    const eventIds = eventParticipations?.map((ep: any) => ep.events.event_id) || [];

    let splits: any[] = [];
    if (eventIds.length > 0) {
      const { data: splitsData, error: splitsError } = await db
        .from('splits')
        .select(`
          split_id,
          title,
          amount,
          notes,
          date,
          created_at,
          paid_by,
          event_id,
          events!inner (
            event_id,
            name
          ),
          split_participants (
            user_id
          )
        `)
        .in('event_id', eventIds);

      if (splitsError) {
        console.error('Splits export error:', splitsError);
      } else {
        splits = splitsData || [];
      }
    }

    // Get payments made by or to user
    const { data: payments, error: paymentsError } = await db
      .from('payments')
      .select(`
        payment_id,
        amount,
        date,
        created_at,
        events!inner (
          event_id,
          name
        )
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

    if (paymentsError) {
      console.error('Payments export error:', paymentsError);
    }

    // Compile all data
    const exportData = {
      _metadata: {
        export_date: new Date().toISOString(),
        description: 'Complete export of your LedgerSplit data',
        data_explanation: {
          events: 'All events you have participated in',
          bills: 'All bills/expenses from your events',
          payments: 'Records of payments made between users (settling up)'
        }
      },
      user_profile: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        venmo_username: user.venmo_username,
        account_created: user.created_at
      },
      events: eventParticipations?.map((ep: any) => ({
        event_id: ep.events.event_id,
        name: ep.events.name,
        description: ep.events.description,
        created_at: ep.events.created_at
      })) || [],
      bills: splits || [],
      payments: payments || [],
      summary: {
        total_events: eventParticipations?.length || 0,
        total_bills: splits?.length || 0,
        total_payments: payments?.length || 0
      }
    };

    // Set headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="ledgersplit-data-${userId}-${Date.now()}.json"`);

    res.json(exportData);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Failed to export data.' });
  }
};