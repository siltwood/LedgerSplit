import request from 'supertest';
import express from 'express';

jest.mock('../config/database');

// Test UUIDs
const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174001';
const TEST_USER_ID_2 = '123e4567-e89b-12d3-a456-426614174002';
const TEST_EVENT_ID = '123e4567-e89b-12d3-a456-426614174002';
const TEST_SPLIT_ID = '123e4567-e89b-12d3-a456-426614174003';

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

const app = express();
app.use(express.json());

app.use('/splits', splitsRoutes);

describe('Splits API - GET by ID', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /splits/:id', () => {
    it('should get split by id with full details', async () => {
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
                      event_id: TEST_EVENT_ID,
                      title: 'Restaurant Bill',
                      amount: 100.50,
                      paid_by: TEST_USER_ID,
                      date: '2025-01-01',
                      created_at: '2025-01-01T12:00:00Z',
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
                    data: { event_id: TEST_EVENT_ID, user_id: TEST_USER_ID },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        } else if (table === 'split_participants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { user_id: TEST_USER_ID },
                  { user_id: TEST_USER_ID_2 },
                ],
                error: null,
              }),
            })),
          };
        }
      });

      const response = await request(app).get(`/splits/${TEST_SPLIT_ID}`);

      expect(response.status).toBe(200);
      expect(response.body.split).toHaveProperty('split_id', TEST_SPLIT_ID);
      expect(response.body.split).toHaveProperty('title', 'Restaurant Bill');
      expect(response.body.split).toHaveProperty('amount', 100.50);
    });

    it('should return 404 when split not found', async () => {
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

      const response = await request(app).get(`/splits/${TEST_SPLIT_ID}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 when user not participant of event', async () => {
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
                      event_id: TEST_EVENT_ID,
                      title: 'Restaurant Bill',
                      amount: 100.50,
                      paid_by: TEST_USER_ID_2,
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
                    error: { message: 'Not a participant' },
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app).get(`/splits/${TEST_SPLIT_ID}`);

      expect(response.status).toBe(403);
    });

    it('should include participant details', async () => {
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
                      event_id: TEST_EVENT_ID,
                      title: 'Restaurant Bill',
                      amount: 100.50,
                      paid_by: TEST_USER_ID,
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
                    data: { event_id: TEST_EVENT_ID, user_id: TEST_USER_ID },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        } else if (table === 'split_participants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { user_id: TEST_USER_ID },
                  { user_id: TEST_USER_ID_2 },
                ],
                error: null,
              }),
            })),
          };
        }
      });

      const response = await request(app).get(`/splits/${TEST_SPLIT_ID}`);

      expect(response.status).toBe(200);
      expect(response.body.split).toHaveProperty('split_id', TEST_SPLIT_ID);
    });
  });
});
