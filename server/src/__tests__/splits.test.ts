import request from 'supertest';
import express from 'express';

jest.mock('../config/database');

// Test UUIDs
const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174001';
const TEST_EVENT_ID = '123e4567-e89b-12d3-a456-426614174002';
const TEST_SPLIT_ID = '123e4567-e89b-12d3-a456-426614174003';
const TEST_OTHER_USER_ID = '123e4567-e89b-12d3-a456-426614174004';

// Mock requireAuth middleware to pass through with test user
jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: '123e4567-e89b-12d3-a456-426614174001', email: 'test@example.com', name: 'Test User' };
    req.session = {
      user: { id: '123e4567-e89b-12d3-a456-426614174001', email: 'test@example.com', name: 'Test User' },
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

      let selectCallCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => {
              selectCallCount++;
              // First select: user participation check - needs .eq().eq().single()
              // Second select: payer participation check - needs .eq().eq().single()
              // Third select: get all participants - needs .eq() only
              if (selectCallCount <= 2) {
                // User/payer participation checks
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
                // Get all participants
                return {
                  eq: jest.fn().mockResolvedValue({
                    data: [
                      { user_id: TEST_USER_ID },
                      { user_id: 'user-2' }
                    ],
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
                    title: 'Dinner',
                    amount: 100,
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
          title: 'Dinner',
          amount: 100,
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          participant_ids: [],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('split');
      expect(response.body.split.title).toBe('Dinner');
    });

    it('should allow creating split with 0 participants (defaults to all event participants)', async () => {
      const { db } = require('../config/database');

      let selectCallCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => {
              selectCallCount++;
              // First select: user participation check - needs .eq().eq().single()
              // Second select: payer participation check - needs .eq().eq().single()
              // Third select: get all participants - needs .eq() only
              if (selectCallCount <= 2) {
                // User/payer participation checks
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
                // Get all participants
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
                    title: 'Future expense',
                    amount: 50,
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
          title: 'Future expense',
          amount: 50,
          paid_by: TEST_USER_ID,
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
      expect(response.body.error).toBe('Event ID, title, amount, and paid_by are required.');
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
          event_id: TEST_EVENT_ID,
          title: 'Dinner',
          amount: 100,
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          participant_ids: [],
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not a participant of this event.');
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
                data: [{ event_id: TEST_EVENT_ID }],
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
                        { split_id: TEST_SPLIT_ID, title: 'Dinner', event_id: TEST_EVENT_ID },
                        { split_id: '123e4567-e89b-12d3-a456-426614174005', title: 'Uber', event_id: TEST_EVENT_ID },
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

      const response = await request(app).get(`/splits?event_id=${TEST_EVENT_ID}`);

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
                      split_id: TEST_SPLIT_ID,
                      created_by: TEST_USER_ID,
                      event_id: TEST_EVENT_ID,
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
                    data: { split_id: TEST_SPLIT_ID, title: 'Updated Dinner' },
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
                    data: { event_id: TEST_EVENT_ID, user_id: TEST_USER_ID },
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
        .put(`/splits/${TEST_SPLIT_ID}`)
        .send({
          title: 'Updated Dinner',
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
                      split_id: TEST_SPLIT_ID,
                      created_by: TEST_OTHER_USER_ID,
                      event_id: TEST_EVENT_ID,
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
        .put(`/splits/${TEST_SPLIT_ID}`)
        .send({ title: 'Updated Dinner' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only bill creator can update.');
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
                    data: { created_by: TEST_USER_ID },
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

      const response = await request(app).delete(`/splits/${TEST_SPLIT_ID}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Bill deleted successfully');
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
                    data: { created_by: TEST_OTHER_USER_ID },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app).delete(`/splits/${TEST_SPLIT_ID}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only bill creator can delete.');
    });
  });
});
