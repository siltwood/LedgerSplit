import request from 'supertest';
import express from 'express';
import session from 'express-session';
import expensesRoutes from '../routes/expenses';

jest.mock('../config/database');

const app = express();
app.use(express.json());
app.use(
  session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  })
);

// Mock auth middleware
app.use((req: any, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com', name: 'Test User' };
  next();
});

app.use('/expenses', expensesRoutes);

describe('Expenses API', () => {
  describe('POST /expenses', () => {
    it('should create expense with valid splits', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                expense_id: '123',
                description: 'Dinner',
                amount: 100,
              },
              error: null,
            }),
          })),
        })),
      }));

      const response = await request(app)
        .post('/expenses')
        .send({
          description: 'Dinner',
          amount: 100,
          paid_by: 'user1',
          date: '2025-01-01',
          splits: [
            { user_id: 'user1', amount_owed: 50 },
            { user_id: 'user2', amount_owed: 50 },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('expense');
    });

    it('should reject if splits do not sum to amount', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          description: 'Dinner',
          amount: 100,
          paid_by: 'user1',
          date: '2025-01-01',
          splits: [
            { user_id: 'user1', amount_owed: 30 },
            { user_id: 'user2', amount_owed: 50 },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Splits must sum to total amount');
    });
  });

  describe('Split validation', () => {
    it('should accept splits that sum correctly with rounding', () => {
      const splits = [
        { user_id: 'user1', amount_owed: 33.33 },
        { user_id: 'user2', amount_owed: 33.33 },
        { user_id: 'user3', amount_owed: 33.34 },
      ];

      const total = splits.reduce((sum, split) => sum + split.amount_owed, 0);
      const amount = 100.0;

      expect(Math.abs(total - amount)).toBeLessThan(0.01);
    });

    it('should handle percentage splits', () => {
      const amount = 100;
      const percentages = [40, 30, 30]; // percents

      const splits = percentages.map((pct) => ({
        amount_owed: (amount * pct) / 100,
      }));

      const total = splits.reduce((sum, split) => sum + split.amount_owed, 0);

      expect(total).toBe(amount);
    });

    it('should handle shares split', () => {
      const amount = 150;
      const shares = [2, 1, 2]; // user1 pays for 2, user2 for 1, user3 for 2
      const totalShares = shares.reduce((sum, s) => sum + s, 0);

      const splits = shares.map((share) => ({
        amount_owed: (amount * share) / totalShares,
      }));

      const total = splits.reduce((sum, split) => sum + split.amount_owed, 0);

      expect(total).toBe(amount);
    });
  });
});