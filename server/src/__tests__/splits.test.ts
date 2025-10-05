import request from 'supertest';
import express from 'express';

jest.mock('../config/database');

// Mock requireAuth middleware to pass through with test user
jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com', name: 'Test User' };
    req.session = {
      user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User' },
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

const app = express();
app.use(express.json());

app.use('/splits', splitsRoutes);

describe('Splits API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /splits', () => {
    it('should create split with equal amounts', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { event_id: 'event-123', user_id: 'test-user-id' },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        } else if (table === 'splits') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    split_id: 'split-123',
                    event_id: 'event-123',
                    title: 'Dinner',
                    amount: 100,
                    paid_by: 'test-user-id',
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
          event_id: 'event-123',
          title: 'Dinner',
          amount: 100,
          paid_by: 'test-user-id',
          date: '2025-01-01',
          participant_ids: ['user-1', 'user-2'],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('split');
      expect(response.body.split.title).toBe('Dinner');
    });

    it('should allow creating split with 0 participants', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { event_id: 'event-123', user_id: 'test-user-id' },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        } else if (table === 'splits') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    split_id: 'split-123',
                    event_id: 'event-123',
                    title: 'Future expense',
                    amount: 50,
                    paid_by: 'test-user-id',
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .post('/splits')
        .send({
          event_id: 'event-123',
          title: 'Future expense',
          amount: 50,
          paid_by: 'test-user-id',
          date: '2025-01-01',
          participant_ids: [],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('split');
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/splits')
        .send({
          title: 'Dinner',
          amount: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Event ID, title, amount, and paid_by are required');
    });

    it('should fail if user not participant of event', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
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

      const response = await request(app)
        .post('/splits')
        .send({
          event_id: 'event-123',
          title: 'Dinner',
          amount: 100,
          paid_by: 'test-user-id',
          date: '2025-01-01',
          participant_ids: ['user-1'],
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not a participant of this event');
    });
  });

  describe('GET /splits', () => {
    it('should return splits filtered by event_id', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                data: [{ event_id: 'event-123' }],
                error: null,
              }),
            })),
          };
        } else if (table === 'splits') {
          return {
            select: jest.fn(() => ({
              in: jest.fn(() => ({
                is: jest.fn(() => ({
                  order: jest.fn(() => ({
                    eq: jest.fn().mockResolvedValue({
                      data: [
                        { split_id: 'split-1', title: 'Dinner', event_id: 'event-123' },
                        { split_id: 'split-2', title: 'Uber', event_id: 'event-123' },
                      ],
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app).get('/splits?event_id=event-123');

      expect(response.status).toBe(200);
      expect(response.body.splits).toHaveLength(2);
    });
  });

  describe('PUT /splits/:id', () => {
    it('should update split and recalculate amounts if participants changed', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      split_id: 'split-123',
                      created_by: 'test-user-id',
                      event_id: 'event-123',
                      amount: 100,
                    },
                    error: null,
                  }),
                })),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { split_id: 'split-123', title: 'Updated Dinner' },
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
                    data: { event_id: 'event-123', user_id: 'user-1' },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        } else if (table === 'split_participants') {
          return {
            delete: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ error: null }),
            })),
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const response = await request(app)
        .put('/splits/split-123')
        .send({
          title: 'Updated Dinner',
          participant_ids: ['user-1', 'user-2', 'user-3'],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('split');
    });

    it('should fail if user is not creator', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      split_id: 'split-123',
                      created_by: 'other-user-id',
                      event_id: 'event-123',
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .put('/splits/split-123')
        .send({ title: 'Updated Dinner' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only split creator can update');
    });
  });

  describe('DELETE /splits/:id', () => {
    it('should soft delete split if user is creator', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { created_by: 'test-user-id' },
                    error: null,
                  }),
                })),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
      });

      const response = await request(app).delete('/splits/split-123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Split deleted successfully');
    });

    it('should fail if user is not creator', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { created_by: 'other-user-id' },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app).delete('/splits/split-123');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only split creator can delete');
    });
  });
});
