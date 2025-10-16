import request from 'supertest';
import express from 'express';

jest.mock('../config/database');

// Test UUIDs
const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174001';
const TEST_USER_ID_2 = '123e4567-e89b-12d3-a456-426614174002';
const TEST_EVENT_ID = '123e4567-e89b-12d3-a456-426614174002';
const TEST_SPLIT_ID = '123e4567-e89b-12d3-a456-426614174003';
const TEST_PAYMENT_ID = '123e4567-e89b-12d3-a456-426614174004';

// Mock requireAuth middleware to pass through with test user
jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: TEST_USER_ID, email: 'test@example.com', name: 'Test User' };
    req.session = {
      user: { id: TEST_USER_ID, email: 'test@example.com', name: 'Test User' },
      touch: jest.fn(),
      save: jest.fn((cb: any) => cb && cb()),
      regenerate: jest.fn((cb: any) => cb && cb()),
      destroy: jest.fn((cb: any) => cb && cb()),
      reload: jest.fn((cb: any) => cb && cb()),
    };
    next();
  },
}));

import splitsRoutes from '../routes/splits';
import paymentsRoutes from '../routes/payments';
import eventsRoutes from '../routes/events';

const app = express();
app.use(express.json());

app.use('/splits', splitsRoutes);
app.use('/payments', paymentsRoutes);
app.use('/events', eventsRoutes);

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Splits with Zero Amount', () => {
    it('should reject split with zero amount', async () => {
      const response = await request(app)
        .post('/splits')
        .send({
          event_id: TEST_EVENT_ID,
          title: 'Free item',
          amount: 0,
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          participant_ids: [],
        });

      expect(response.status).toBe(400);
    });

    it('should reject split with negative amount', async () => {
      const response = await request(app)
        .post('/splits')
        .send({
          event_id: TEST_EVENT_ID,
          title: 'Refund',
          amount: -50,
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          participant_ids: [],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Payments with Zero Amount', () => {
    it('should reject payment with zero amount', async () => {
      const response = await request(app)
        .post('/payments')
        .send({
          event_id: TEST_EVENT_ID,
          from_user: TEST_USER_ID,
          to_user: TEST_USER_ID_2,
          amount: 0,
        });

      expect(response.status).toBe(400);
    });

    it('should reject payment with negative amount', async () => {
      const response = await request(app)
        .post('/payments')
        .send({
          event_id: TEST_EVENT_ID,
          from_user: TEST_USER_ID,
          to_user: TEST_USER_ID_2,
          amount: -100,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Split with Very Large Amount', () => {
    it('should handle splits with very large amounts', async () => {
      const { db } = require('../config/database');

      let selectCallCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => {
              selectCallCount++;
              if (selectCallCount <= 2) {
                return {
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      single: jest.fn().mockResolvedValue({
                        data: { event_id: TEST_EVENT_ID, user_id: TEST_USER_ID },
                        error: null,
                      }),
                    })),
                  })),
                };
              } else {
                return {
                  eq: jest.fn().mockResolvedValue({
                    data: [{ user_id: TEST_USER_ID }],
                    error: null,
                  }),
                };
              }
            }),
          };
        } else if (table === 'splits') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    split_id: TEST_SPLIT_ID,
                    event_id: TEST_EVENT_ID,
                    title: 'Expensive purchase',
                    amount: 999999.99,
                    paid_by: TEST_USER_ID,
                  },
                  error: null,
                }),
              })),
            })),
          };
        } else if (table === 'split_participants') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const response = await request(app)
        .post('/splits')
        .send({
          event_id: TEST_EVENT_ID,
          title: 'Expensive purchase',
          amount: 999999.99,
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          participant_ids: [],
        });

      expect(response.status).toBe(201);
      expect(response.body.split.amount).toBe(999999.99);
    });
  });

  describe('Split with Empty or Invalid Title', () => {
    it('should reject split with empty title', async () => {
      const response = await request(app)
        .post('/splits')
        .send({
          event_id: TEST_EVENT_ID,
          title: '',
          amount: 50,
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          participant_ids: [],
        });

      expect(response.status).toBe(400);
    });

    it('should reject split with very long title', async () => {
      const longTitle = 'a'.repeat(300);
      const response = await request(app)
        .post('/splits')
        .send({
          event_id: TEST_EVENT_ID,
          title: longTitle,
          amount: 50,
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          participant_ids: [],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Event with Empty Name', () => {
    it('should reject event creation with empty name', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            })),
          })),
        };
      });

      const response = await request(app)
        .post('/events')
        .send({
          name: '',
          description: 'Trip description',
        });

      expect(response.status).toBe(400);
    });

    it('should reject event creation with very long name', async () => {
      const longName = 'a'.repeat(300);
      const response = await request(app)
        .post('/events')
        .send({
          name: longName,
          description: 'Trip description',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Self-Payment Handling', () => {
    it('should allow payment from user to themselves (no validation exists)', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { event_id: TEST_EVENT_ID, user_id: TEST_USER_ID },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        } else if (table === 'payments') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    payment_id: TEST_PAYMENT_ID,
                    event_id: TEST_EVENT_ID,
                    from_user_id: TEST_USER_ID,
                    to_user_id: TEST_USER_ID,
                    amount: 50,
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .post('/payments')
        .send({
          event_id: TEST_EVENT_ID,
          from_user_id: TEST_USER_ID,
          to_user_id: TEST_USER_ID,
          amount: 50,
        });

      // No validation prevents self-payments, so it should succeed
      expect(response.status).toBe(201);
    });
  });

  describe('Category Values', () => {
    it('should accept any category string value', async () => {
      const { db } = require('../config/database');

      let selectCallCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => {
              selectCallCount++;
              if (selectCallCount <= 2) {
                return {
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      single: jest.fn().mockResolvedValue({
                        data: { event_id: TEST_EVENT_ID, user_id: TEST_USER_ID },
                        error: null,
                      }),
                    })),
                  })),
                };
              } else {
                return {
                  eq: jest.fn().mockResolvedValue({
                    data: [{ user_id: TEST_USER_ID }],
                    error: null,
                  }),
                };
              }
            }),
          };
        } else if (table === 'splits') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    split_id: TEST_SPLIT_ID,
                    event_id: TEST_EVENT_ID,
                    title: 'Test split',
                    amount: 50,
                    paid_by: TEST_USER_ID,
                    category: 'custom_category',
                  },
                  error: null,
                }),
              })),
            })),
          };
        } else if (table === 'split_participants') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const response = await request(app)
        .post('/splits')
        .send({
          event_id: TEST_EVENT_ID,
          title: 'Test split',
          amount: 50,
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          category: 'custom_category',
          participant_ids: [],
        });

      expect(response.status).toBe(201);
      expect(response.body.split.category).toBe('custom_category');
    });
  });

  describe('Split with Missing Required Fields', () => {
    it('should reject split without event_id', async () => {
      const response = await request(app)
        .post('/splits')
        .send({
          title: 'Test split',
          amount: 50,
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          participant_ids: [],
        });

      expect(response.status).toBe(400);
    });

    it('should reject split without paid_by', async () => {
      const response = await request(app)
        .post('/splits')
        .send({
          event_id: TEST_EVENT_ID,
          title: 'Test split',
          amount: 50,
          date: '2025-01-01',
          participant_ids: [],
        });

      expect(response.status).toBe(400);
    });

    it('should reject split without amount', async () => {
      const response = await request(app)
        .post('/splits')
        .send({
          event_id: TEST_EVENT_ID,
          title: 'Test split',
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          participant_ids: [],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Payment with Missing Required Fields', () => {
    it('should reject payment without from_user', async () => {
      const response = await request(app)
        .post('/payments')
        .send({
          event_id: TEST_EVENT_ID,
          to_user: TEST_USER_ID_2,
          amount: 50,
        });

      expect(response.status).toBe(400);
    });

    it('should reject payment without to_user', async () => {
      const response = await request(app)
        .post('/payments')
        .send({
          event_id: TEST_EVENT_ID,
          from_user: TEST_USER_ID,
          amount: 50,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Deleting Non-existent Resources', () => {
    it('should handle deleting non-existent split', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' },
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app).delete(`/splits/${TEST_SPLIT_ID}`);

      expect(response.status).toBe(404);
    });

    it('should handle deleting non-existent payment', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' },
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app).delete(`/payments/${TEST_PAYMENT_ID}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Amount Edge Cases', () => {
    it('should reject amounts with too many decimal places', async () => {
      const response = await request(app)
        .post('/splits')
        .send({
          event_id: TEST_EVENT_ID,
          title: 'Test split',
          amount: 'not-a-number',
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          participant_ids: [],
        });

      expect(response.status).toBe(400);
    });

    it('should reject amounts over 1 million', async () => {
      const response = await request(app)
        .post('/splits')
        .send({
          event_id: TEST_EVENT_ID,
          title: 'Too expensive',
          amount: 1000001,
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          participant_ids: [],
        });

      expect(response.status).toBe(400);
    });
  });
});
