import { Router } from 'express';
import {
  register,
  login,
  getGoogleAuthUrl,
  handleGoogleCallback,
  getCurrentUser,
  logout,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Email/password auth
router.post('/register', register);
router.post('/login', login);

// Google OAuth
router.get('/google', getGoogleAuthUrl);
router.get('/google/callback', handleGoogleCallback);

// User routes
router.get('/me', getCurrentUser);
router.post('/logout', logout);

export default router;