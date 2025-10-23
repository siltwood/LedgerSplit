import { Router } from 'express';
import {
  register,
  login,
  getGoogleAuthUrl,
  handleGoogleCallback,
  getCurrentUser,
  logout,
  requestPasswordReset,
  resetPassword,
  requestPasswordChange,
  deleteAccount,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Email/password auth
router.post('/register', register);
router.post('/login', login);

// Google OAuth
router.get('/google', (req, res) => {
  console.log('🔵 HIT /google route');
  getGoogleAuthUrl(req, res);
});
router.get('/google/callback', handleGoogleCallback);

// Password reset/change
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/change-password', requireAuth, requestPasswordChange);

// User routes
router.get('/me', getCurrentUser);
router.post('/logout', logout);
router.delete('/account', requireAuth, deleteAccount);

export default router;