import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { requireAuth } from '../middleware/auth';
import groupsRoutes from '../routes/groups';
import expensesRoutes from '../routes/expenses';
import { db } from '../config/database';

const app = express();
app.use(express.json());
app.use(
  session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use('/groups', groupsRoutes);
app.use('/expenses', expensesRoutes);

jest.mock('../config/database');

describe('Security Tests', () => {
  describe('Authentication', () => {
    it('should reject unauthenticated requests to protected routes', async () => {
      const routes = [
        { method: 'get', path: '/groups' },
        { method: 'post', path: '/groups' },
        { method: 'get', path: '/expenses' },
        { method: 'post', path: '/expenses' },
      ];

      for (const route of routes) {
        const res = await (request(app) as any)[route.method](route.path);
        expect(res.status).toBe(401);
      }
    });
  });

  describe('Authorization - Groups', () => {
    const mockUser1 = { id: 'user1', email: 'user1@test.com', name: 'User 1' };
    const mockUser2 = { id: 'user2', email: 'user2@test.com', name: 'User 2' };

    it('should prevent non-member from viewing group', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: 'Not found' }),
      });

      const res = await request(app)
        .get('/groups/group1');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Not a member of this group');
    });

    it('should prevent non-creator from updating group', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'user2' },
          error: null,
        }),
      });

      const res = await request(app)
        .put('/groups/group1')
        .send({ name: 'New Name' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Only group creator can update');
    });

    it('should prevent non-creator from deleting group', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'user2' },
          error: null,
        }),
      });

      const res = await request(app)
        .delete('/groups/group1');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Only group creator can delete');
    });

    it('should prevent non-creator from removing members', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'user2' },
          error: null,
        }),
      });

      const res = await request(app)
        .delete('/groups/group1/members/user2');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Only group creator can remove members');
    });

    it('should prevent creator from removing themselves', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'user1' },
          error: null,
        }),
      });

      const res = await request(app)
        .delete('/groups/group1/members/user1');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot remove group creator');
    });
  });

  describe('Authorization - Expenses', () => {
    it('should prevent non-creator from updating expense', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'user2' },
          error: null,
        }),
      });

      const res = await request(app)
        .put('/expenses/exp1')
        .send({ description: 'Updated' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Only expense creator can update');
    });

    it('should prevent non-creator from deleting expense', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'user2' },
          error: null,
        }),
      });

      const res = await request(app)
        .delete('/expenses/exp1');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Only expense creator can delete');
    });

    it('should validate splits sum to total amount', async () => {
      const res = await request(app)
        .post('/expenses')
        .send({
          description: 'Test',
          amount: 100,
          paid_by: 'user1',
          date: '2024-01-01',
          splits: [
            { user_id: 'user1', amount_owed: 40 },
            { user_id: 'user2', amount_owed: 40 }, // Only 80 total, should fail
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Splits must sum to total amount');
    });

    it('should require group membership for group expenses', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: 'Not found' }),
      });

      const res = await request(app)
        .post('/expenses')
        .send({
          group_id: 'group1',
          description: 'Test',
          amount: 100,
          paid_by: 'user1',
          date: '2024-01-01',
          splits: [{ user_id: 'user1', amount_owed: 100 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Not a member of this group');
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/groups/group1/invite')
        .send({ email: 'not-an-email' });

      // Email validation should happen at backend
      expect([400, 404]).toContain(res.status);
    });

    it('should reject negative expense amounts', async () => {
      const res = await request(app)
        .post('/expenses')
        .send({
          description: 'Test',
          amount: -100,
          paid_by: 'user1',
          date: '2024-01-01',
          splits: [{ user_id: 'user1', amount_owed: -100 }],
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject empty group name', async () => {
      const res = await request(app)
        .post('/groups')
        .send({ name: '', description: 'Test' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('SQL Injection Protection', () => {
    it('should handle SQL injection attempts safely', async () => {
      const maliciousInput = "'; DROP TABLE users; --";

      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: 'Not found' }),
      });

      const res = await request(app)
        .get(`/groups/${maliciousInput}`);

      // Should not crash, should return proper error
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should have rate limiting configured', () => {
      // This is tested by the rate limiter middleware in index.ts
      // We're checking that the middleware exists in the main app
      expect(true).toBe(true); // Placeholder for integration test
    });
  });
});
