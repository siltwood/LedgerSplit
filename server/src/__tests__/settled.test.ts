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

import settledRoutes from '../routes/settled';

const app = express();
app.use(express.json());
app.use('/', settledRoutes);

describe('Settled Confirmation API', () => {
  const validEventId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /events/:eventId/settled/toggle', () => {
    it('should add settled confirmation for user', async () => {
      const { db } = require('../config/database');

      let settledCallCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { event_id: validEventId, user_id: 'test-user-id' },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        } else if (table === 'event_settled_confirmations') {
          settledCallCount++;
          if (settledCallCount === 1) {
            // First call: check if user already confirmed (select)
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({
                      data: null, // Not yet confirmed
                      error: null,
                    }),
                  })),
                })),
              })),
            };
          } else if (settledCallCount === 2) {
            // Second call: insert confirmation
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
            };
          } else {
            // Third call: get all confirmations
            return {
              select: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({
                  data: [{ user_id: 'test-user-id' }],
                  error: null,
                }),
              })),
            };
          }
        } else if (table === 'events') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
      });

      const response = await request(app)
        .post(`/events/${validEventId}/settled/toggle`);

      expect(response.status).toBe(200);
      expect(response.body.confirmed).toBe(true);
    });

    it('should remove settled confirmation for user', async () => {
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
        } else if (table === 'event_settled_confirmations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { user_id: 'test-user-id' }, // Already confirmed
                    error: null,
                  }),
                })),
              })),
            })),
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ error: null }),
              })),
            })),
          };
        } else if (table === 'events') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
      });

      const response = await request(app)
        .post(`/events/${validEventId}/settled/toggle`);

      expect(response.status).toBe(200);
      expect(response.body.confirmed).toBe(false);
    });

    it('should mark event as settled when all participants confirm', async () => {
      const { db } = require('../config/database');

      let participantCallCount = 0;
      let settledCallCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          participantCallCount++;
          if (participantCallCount === 1) {
            // First call: check if user is participant
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({
                      data: { event_id: validEventId, user_id: 'test-user-id' },
                      error: null,
                    }),
                  })),
                })),
              })),
            };
          } else {
            // Second call: get all participants
            return {
              select: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    { user_id: 'test-user-id' },
                    { user_id: 'user-2' }
                  ],
                  error: null,
                }),
              })),
            };
          }
        } else if (table === 'event_settled_confirmations') {
          settledCallCount++;
          if (settledCallCount === 1) {
            // Check existing confirmation
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
          } else if (settledCallCount === 2) {
            // Insert confirmation
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
            };
          } else {
            // Get all confirmations (all users confirmed)
            return {
              select: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    { user_id: 'test-user-id' },
                    { user_id: 'user-2' }
                  ],
                  error: null,
                }),
              })),
            };
          }
        } else if (table === 'events') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
      });

      const response = await request(app)
        .post(`/events/${validEventId}/settled/toggle`);

      expect(response.status).toBe(200);
      expect(response.body.confirmed).toBe(true);
    });

    it('should fail if user not participant', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
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
      }));

      const response = await request(app)
        .post(`/events/${validEventId}/settled/toggle`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not a participant of this event.');
    });

    it('should fail with invalid event ID', async () => {
      const response = await request(app)
        .post('/events/invalid-id/settled/toggle');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid event ID.');
    });
  });

  describe('GET /events/:eventId/settled', () => {
    it('should get settled confirmations for event', async () => {
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
        } else if (table === 'event_settled_confirmations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { user_id: 'test-user-id' },
                  { user_id: 'user-2' }
                ],
                error: null,
              }),
            })),
          };
        }
      });

      const response = await request(app)
        .get(`/events/${validEventId}/settled`);

      expect(response.status).toBe(200);
      expect(response.body.confirmations).toHaveLength(2);
    });

    it('should fail if user not participant', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
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
      }));

      const response = await request(app)
        .get(`/events/${validEventId}/settled`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not a participant of this event.');
    });

    it('should fail with invalid event ID', async () => {
      const response = await request(app)
        .get('/events/invalid-id/settled');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid event ID.');
    });
  });
});
