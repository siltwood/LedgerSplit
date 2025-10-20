import request from 'supertest';
import express from 'express';

jest.mock('../config/database');

// Mock requireAuth middleware
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

import eventsRoutes from '../routes/events';

const app = express();
app.use(express.json());
app.use('/events', eventsRoutes);

describe('Pagination Tests - Large Dataset Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /events', () => {
    it('should handle 50 events (10 pages at 5 per page)', async () => {
      const { db } = require('../config/database');

      const mockEvents = Array.from({ length: 50 }, (_, i) => ({
        events: {
          event_id: `event-${i + 1}`,
          name: `Event ${i + 1}`,
          description: `Description ${i + 1}`,
          created_by: 'test-user-id',
          created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          is_settled: i % 3 === 0,
        },
      }));

      const eventIds = mockEvents.map((e) => e.events.event_id);
      let callCount = 0;

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          callCount++;
          if (callCount === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockResolvedValue({
                    data: mockEvents,
                    error: null,
                  }),
                }),
              }),
            };
          } else {
            return {
              select: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: eventIds.map(id => ({
                    event_id: id,
                    user_id: 'test-user-id',
                    joined_at: new Date().toISOString(),
                    users: { user_id: 'test-user-id', name: 'Test', email: 'test@example.com', avatar_url: null },
                  })),
                  error: null,
                }),
              }),
            };
          }
        } else if (table === 'user_event_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'splits') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                is: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      const response = await request(app).get('/events');

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(50);
      expect(response.body.events[0].event_id).toBe('event-1');
      expect(response.body.events[49].event_id).toBe('event-50');
    });

    it('should handle 150 events (30 pages at 5 per page)', async () => {
      const { db } = require('../config/database');

      const mockEvents = Array.from({ length: 150 }, (_, i) => ({
        events: {
          event_id: `event-${i + 1}`,
          name: `Event ${i + 1}`,
          description: '',
          created_by: 'test-user-id',
          created_at: new Date().toISOString(),
          is_settled: false,
        },
      }));

      const eventIds = mockEvents.map((e) => e.events.event_id);
      let callCount = 0;

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          callCount++;
          if (callCount === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockResolvedValue({
                    data: mockEvents,
                    error: null,
                  }),
                }),
              }),
            };
          } else {
            return {
              select: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: eventIds.map(id => ({
                    event_id: id,
                    user_id: 'test-user-id',
                    joined_at: new Date().toISOString(),
                    users: { user_id: 'test-user-id', name: 'Test', email: 'test@example.com', avatar_url: null },
                  })),
                  error: null,
                }),
              }),
            };
          }
        } else if (table === 'user_event_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'splits') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                is: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      const response = await request(app).get('/events');

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(150);
    });

    it('should handle empty dataset', async () => {
      const { db } = require('../config/database');

      let callCount = 0;

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          callCount++;
          if (callCount === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            };
          } else {
            return {
              select: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            };
          }
        } else if (table === 'user_event_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'splits') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                is: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      const response = await request(app).get('/events');

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(0);
    });

    it('should handle exactly 5 events (1 page)', async () => {
      const { db } = require('../config/database');

      const mockEvents = Array.from({ length: 5 }, (_, i) => ({
        events: {
          event_id: `event-${i + 1}`,
          name: `Event ${i + 1}`,
          description: '',
          created_by: 'test-user-id',
          created_at: new Date().toISOString(),
          is_settled: false,
        },
      }));

      const eventIds = mockEvents.map((e) => e.events.event_id);
      let callCount = 0;

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          callCount++;
          if (callCount === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockResolvedValue({
                    data: mockEvents,
                    error: null,
                  }),
                }),
              }),
            };
          } else {
            return {
              select: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: eventIds.map(id => ({
                    event_id: id,
                    user_id: 'test-user-id',
                    joined_at: new Date().toISOString(),
                    users: { user_id: 'test-user-id', name: 'Test', email: 'test@example.com', avatar_url: null },
                  })),
                  error: null,
                }),
              }),
            };
          }
        } else if (table === 'user_event_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'splits') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                is: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      const response = await request(app).get('/events');

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(5);
    });

    it('should handle 6 events (2 pages: 5 + 1)', async () => {
      const { db } = require('../config/database');

      const mockEvents = Array.from({ length: 6 }, (_, i) => ({
        events: {
          event_id: `event-${i + 1}`,
          name: `Event ${i + 1}`,
          description: '',
          created_by: 'test-user-id',
          created_at: new Date().toISOString(),
          is_settled: false,
        },
      }));

      const eventIds = mockEvents.map((e) => e.events.event_id);
      let callCount = 0;

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          callCount++;
          if (callCount === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockResolvedValue({
                    data: mockEvents,
                    error: null,
                  }),
                }),
              }),
            };
          } else {
            return {
              select: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: eventIds.map(id => ({
                    event_id: id,
                    user_id: 'test-user-id',
                    joined_at: new Date().toISOString(),
                    users: { user_id: 'test-user-id', name: 'Test', email: 'test@example.com', avatar_url: null },
                  })),
                  error: null,
                }),
              }),
            };
          }
        } else if (table === 'user_event_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'splits') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                is: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      const response = await request(app).get('/events');

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(6);
    });
  });
});
