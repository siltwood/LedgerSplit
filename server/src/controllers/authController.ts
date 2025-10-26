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

  // Clear any old OAuth state and store new one
  delete req.session.oauthState;
  req.session.oauthState = state;

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
  if (!state || state !== req.session.oauthState) {
    return res.status(403).json({ error: 'Invalid state parameter.' });
  }

  // Clear state from session
  delete req.session.oauthState;

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
        google_id: user.google_id,
      };

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