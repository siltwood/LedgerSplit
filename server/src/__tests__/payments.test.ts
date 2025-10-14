import request from 'supertest';
import express from 'express';

jest.mock('../config/database');

const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const TEST_EVENT_ID = '123e4567-e89b-12d3-a456-426614174001';
const TEST_PAYMENT_ID = '123e4567-e89b-12d3-a456-426614174002';
const TEST_FROM_USER = '123e4567-e89b-12d3-a456-426614174003';
const TEST_TO_USER = '123e4567-e89b-12d3-a456-426614174004';

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

import paymentsRoutes from '../routes/payments';

const app = express();
app.use(express.json());
app.use('/payments', paymentsRoutes);

describe('Payments API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /payments', () => {
    it('should get all payments for an event', async () => {
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
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  order: jest.fn().mockResolvedValue({
                    data: [
                      {
                        payment_id: TEST_PAYMENT_ID,
                        event_id: TEST_EVENT_ID,
                        from_user_id: TEST_FROM_USER,
                        to_user_id: TEST_TO_USER,
                        amount: 50.00,
                        payment_date: '2025-01-01',
                      },
                    ],
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .get('/payments')
        .query({ event_id: TEST_EVENT_ID })
        ;

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('payments');
      expect(Array.isArray(response.body.payments)).toBe(true);
    });

    it('should fail without event_id', async () => {
      const response = await request(app)
        .get('/payments')
        ;

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Event ID is required.');
    });

    it('should fail if user is not a participant', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .get('/payments')
        .query({ event_id: TEST_EVENT_ID })
        ;

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not a participant of this event.');
    });
  });

  describe('POST /payments', () => {
    it('should create a payment', async () => {
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
                    from_user_id: TEST_FROM_USER,
                    to_user_id: TEST_TO_USER,
                    amount: 50.00,
                    payment_date: '2025-01-01',
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
          from_user_id: TEST_FROM_USER,
          to_user_id: TEST_TO_USER,
          amount: 50.00,
          payment_date: '2025-01-01',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('payment');
      expect(response.body.payment.amount).toBe(50.00);
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/payments')
        
        .send({
          event_id: TEST_EVENT_ID,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Event ID, from_user_id, to_user_id, and amount are required.');
    });

    it('should fail with invalid amount', async () => {
      const response = await request(app)
        .post('/payments')
        
        .send({
          event_id: TEST_EVENT_ID,
          from_user_id: TEST_FROM_USER,
          to_user_id: TEST_TO_USER,
          amount: -50,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid amount.');
    });

    it('should fail with zero amount', async () => {
      const response = await request(app)
        .post('/payments')

        .send({
          event_id: TEST_EVENT_ID,
          from_user_id: TEST_FROM_USER,
          to_user_id: TEST_TO_USER,
          amount: '0',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid amount.');
    });

    it('should fail if user is not a participant', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .post('/payments')
        
        .send({
          event_id: TEST_EVENT_ID,
          from_user_id: TEST_FROM_USER,
          to_user_id: TEST_TO_USER,
          amount: 50,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not a participant of this event.');
    });

    it('should fail if from_user is not a participant', async () => {
      const { db } = require('../config/database');

      let callCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn(() => {
                    callCount++;
                    // First call: current user is participant
                    if (callCount === 1) {
                      return Promise.resolve({
                        data: { event_id: TEST_EVENT_ID, user_id: TEST_USER_ID },
                        error: null,
                      });
                    }
                    // Second call: from_user is NOT a participant
                    if (callCount === 2) {
                      return Promise.resolve({
                        data: null,
                        error: null,
                      });
                    }
                    // Third call: to_user is a participant
                    return Promise.resolve({
                      data: { event_id: TEST_EVENT_ID, user_id: TEST_TO_USER },
                      error: null,
                    });
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .post('/payments')
        
        .send({
          event_id: TEST_EVENT_ID,
          from_user_id: TEST_FROM_USER,
          to_user_id: TEST_TO_USER,
          amount: 50,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Both users must be participants of the event.');
    });
  });

  describe('DELETE /payments/:id', () => {
    it('should delete a payment', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      payment_id: TEST_PAYMENT_ID,
                      event_id: TEST_EVENT_ID,
                      created_by: TEST_USER_ID,
                    },
                    error: null,
                  }),
                })),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            })),
          };
        } else if (table === 'event_participants') {
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
        }
      });

      const response = await request(app)
        .delete(`/payments/${TEST_PAYMENT_ID}`)
        ;

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Payment deleted successfully');
    });

    it('should fail if payment not found', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .delete(`/payments/${TEST_PAYMENT_ID}`)
        ;

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Payment not found.');
    });

    it('should fail if user is not a participant', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      payment_id: TEST_PAYMENT_ID,
                      event_id: TEST_EVENT_ID,
                      created_by: 'other-user',
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        } else if (table === 'event_participants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .delete(`/payments/${TEST_PAYMENT_ID}`)
        ;

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not authorized to delete this payment.');
    });
  });
});
