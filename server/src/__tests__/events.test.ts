import request from 'supertest';
import express from 'express';
import session from 'express-session';
import eventsRoutes from '../routes/events';

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
  req.session = { user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User' } };
  next();
});

app.use('/events', eventsRoutes);

describe('Events API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /events', () => {
    it('should create a new event and auto-add creator as participant', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    event_id: 'event-123',
                    name: 'Vegas Trip',
                    description: 'Weekend getaway',
                    created_by: 'test-user-id',
                  },
                  error: null,
                }),
              })),
            })),
          };
        } else if (table === 'event_participants') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        } else if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  mockResolvedValue: jest.fn().mockResolvedValue({
                    data: [{ user_id: 'friend-123', name: 'Friend' }],
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .post('/events')
        .send({
          name: 'Vegas Trip',
          description: 'Weekend getaway',
          participant_ids: [],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('event');
      expect(response.body.event.name).toBe('Vegas Trip');
    });

    it('should fail without required name', async () => {
      const response = await request(app)
        .post('/events')
        .send({
          description: 'Weekend getaway',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Event name is required');
    });
  });

  describe('GET /events', () => {
    it('should return only events user is part of', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                mockResolvedValue: jest.fn().mockResolvedValue({
                  data: [{ event_id: 'event-123' }, { event_id: 'event-456' }],
                  error: null,
                }),
              })),
            })),
          };
        } else if (table === 'events') {
          return {
            select: jest.fn(() => ({
              in: jest.fn(() => ({
                is: jest.fn(() => ({
                  order: jest.fn().mockResolvedValue({
                    data: [
                      { event_id: 'event-123', name: 'Vegas Trip' },
                      { event_id: 'event-456', name: 'Concert' },
                    ],
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app).get('/events');

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(2);
    });
  });

  describe('POST /events/:id/invite', () => {
    it('should invite user to event', async () => {
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
        } else if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { user_id: 'friend-123', email: 'friend@example.com', name: 'Friend' },
                  error: null,
                }),
              })),
            })),
          };
        } else if (table === 'event_invites') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { invite_id: 'invite-123', status: 'pending' },
                  error: null,
                }),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .post('/events/event-123/invite')
        .send({ user_id: 'friend-123' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Invite sent successfully');
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
        .post('/events/event-123/invite')
        .send({ user_id: 'friend-123' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not a participant of this event');
    });
  });

  describe('POST /events/invites/:id/accept', () => {
    it('should accept invite and add user to all existing splits', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'event_invites') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({
                      data: {
                        invite_id: 'invite-123',
                        event_id: 'event-123',
                        status: 'pending',
                      },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ error: null }),
            })),
          };
        } else if (table === 'event_participants') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        } else if (table === 'splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn().mockResolvedValue({
                  data: [
                    { split_id: 'split-1', amount: 100 },
                    { split_id: 'split-2', amount: 50 },
                  ],
                  error: null,
                }),
              })),
            })),
          };
        } else if (table === 'split_participants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                data: [{ user_id: 'existing-user' }],
                error: null,
              }),
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ error: null }),
              })),
            })),
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const response = await request(app)
        .post('/events/invites/invite-123/accept');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Invite accepted successfully');
    });
  });

  describe('DELETE /events/:id', () => {
    it('should soft delete event if user is creator', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'events') {
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

      const response = await request(app).delete('/events/event-123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Event deleted successfully');
    });

    it('should fail if user is not creator', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'events') {
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

      const response = await request(app).delete('/events/event-123');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only event creator can delete');
    });
  });
});
