import { Response } from 'express';
import bcrypt from 'bcrypt';
import { googleClient } from '../config/google';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';

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
    };

    // Redirect to client with success
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/dashboard`);
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