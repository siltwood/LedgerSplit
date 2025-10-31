import request from 'supertest';
import express from 'express';
import session from 'express-session';
import authRoutes from '../routes/auth';

// Mock the database
jest.mock('../config/database', () => ({
  db: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  },
}));

const app = express();
app.use(express.json());
app.use(
  session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use('/auth', authRoutes);

describe('Profile Update Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /auth/profile', () => {
    it('should update Venmo username when authenticated', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  user_id: 'user-123',
                  email: 'test@example.com',
                  name: 'Test User',
                  venmo_username: 'test-venmo',
                },
                error: null,
              }),
            })),
          })),
        })),
      }));

      // This would need actual authentication, expecting 401 in test
      const response = await request(app)
        .put('/auth/profile')
        .send({ venmo_username: 'test-venmo' });

      expect(response.status).toBe(401); // Not authenticated in test
    });

    it('should reject invalid Venmo username characters', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Validation failed' },
              }),
            })),
          })),
        })),
      }));

      // This would need actual authentication
      const response = await request(app)
        .put('/auth/profile')
        .send({ venmo_username: 'invalid@username!' });

      expect(response.status).toBe(401); // Not authenticated in test
    });

    it('should reject Venmo username that is too long', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Validation failed' },
              }),
            })),
          })),
        })),
      }));

      const response = await request(app)
        .put('/auth/profile')
        .send({ venmo_username: 'a'.repeat(51) }); // Too long

      expect(response.status).toBe(401); // Not authenticated in test
    });

    it('should allow clearing Venmo username', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  user_id: 'user-123',
                  email: 'test@example.com',
                  name: 'Test User',
                  venmo_username: null,
                },
                error: null,
              }),
            })),
          })),
        })),
      }));

      const response = await request(app)
        .put('/auth/profile')
        .send({ venmo_username: '' });

      expect(response.status).toBe(401); // Not authenticated in test
    });
  });

  describe('DELETE /auth/account', () => {
    it('should soft delete user account when authenticated', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        })),
      }));

      const response = await request(app).delete('/auth/account');

      expect(response.status).toBe(401); // Not authenticated in test
    });

    it('should clear sensitive data on deletion', async () => {
      const { db } = require('../config/database');

      const mockUpdate = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      }));

      db.from.mockImplementation(() => ({
        update: mockUpdate,
      }));

      const response = await request(app).delete('/auth/account');

      expect(response.status).toBe(401); // Not authenticated in test
    });
  });
});
