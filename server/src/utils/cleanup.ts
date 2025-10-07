import { db } from '../config/database';

// Cleanup expired password reset tokens
export const cleanupExpiredTokens = async () => {
  try {
    const { error } = await db
      .from('password_reset_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error cleaning up expired tokens:', error);
    } else {
      console.log('Expired password reset tokens cleaned up');
    }
  } catch (error) {
    console.error('Error in cleanupExpiredTokens:', error);
  }
};

// Run cleanup every hour
export const startCleanupScheduler = () => {
  // Run immediately on startup
  cleanupExpiredTokens();

  // Then run every hour
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
};
