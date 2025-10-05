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

// Mock email service
jest.mock('../services/email', () => ({
  sendEventInviteEmail: jest.fn().mockResolvedValue(true),
}));

import eventsRoutes from '../routes/events';

const app = express();
app.use(express.json());

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

      db.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              data: [
                { events: { event_id: 'event-123', name: 'Vegas Trip' } },
                { events: { event_id: 'event-456', name: 'Concert' } },
              ],
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app).get('/events');

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(2);
    });
  });

  describe('POST /events/:id/invite', () => {
    it('should invite user by user_id to event', async () => {
      const { db } = require('../config/database');

      let eventParticipantsCallCount = 0;
      let eventInvitesCallCount = 0;
      let usersCallCount = 0;

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          eventParticipantsCallCount++;
          if (eventParticipantsCallCount === 1) {
            // First call: check if current user is participant - should return data
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { event_id: 'event-123', user_id: 'test-user-id' },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          } else {
            // Second call: check if invited user already participant - should return null
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
        } else if (table === 'events') {
          // Get event details
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { event_id: 'event-123', name: 'Test Event' },
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'users') {
          usersCallCount++;
          if (usersCallCount === 1) {
            // First call: get inviter name
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { user_id: 'test-user-id', name: 'Test User' },
                    error: null,
                  }),
                }),
              }),
            };
          } else {
            // Second call: verify invited user exists
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { user_id: 'friend-123', email: 'friend@example.com', name: 'Friend' },
                    error: null,
                  }),
                }),
              }),
            };
          }
        } else if (table === 'friends') {
          // Check block status - no blocks
          return {
            select: jest.fn().mockReturnValue({
              or: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (table === 'event_invites') {
          eventInvitesCallCount++;
          if (eventInvitesCallCount === 1) {
            // First call: check for existing invite - should return null
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({
                        data: null,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          } else {
            // Second call: insert new invite - should return data
            return {
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { invite_id: 'invite-123', status: 'pending' },
                    error: null,
                  }),
                }),
              }),
            };
          }
        }
      });

      const response = await request(app)
        .post('/events/event-123/invite')
        .send({ user_id: 'friend-123' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Invite sent successfully');
    });

    it('should fail if user has blocked the invitee', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { event_id: 'event-123', user_id: 'test-user-id' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (table === 'events') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { event_id: 'event-123', name: 'Test Event' },
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { user_id: 'friend-123', email: 'friend@example.com', name: 'Friend' },
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'friends') {
          // User has blocked the friend
          return {
            select: jest.fn().mockReturnValue({
              or: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { status: 'blocked' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
      });

      const response = await request(app)
        .post('/events/event-123/invite')
        .send({ user_id: 'friend-123' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot invite this user');
    });

    it('should invite user by email (non-existing user)', async () => {
      const { db } = require('../config/database');
      const { sendEventInviteEmail } = require('../services/email');

      let eventInvitesCallCount = 0;

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { event_id: 'event-123', user_id: 'test-user-id' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (table === 'events') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { event_id: 'event-123', name: 'Test Event' },
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null, // User doesn't exist
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'event_invites') {
          eventInvitesCallCount++;
          if (eventInvitesCallCount === 1) {
            // Check for existing invite
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({
                        data: null,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          } else {
            // Insert new email invite
            return {
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      invite_id: 'invite-123',
                      status: 'pending',
                      invite_token: 'token-123'
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
        }
      });

      const response = await request(app)
        .post('/events/event-123/invite')
        .send({ email: 'newuser@example.com' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Invite sent successfully');
      expect(sendEventInviteEmail).toHaveBeenCalled();
    });

    it('should fail if trying to invite by email when user already exists', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { event_id: 'event-123', user_id: 'test-user-id' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (table === 'events') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { event_id: 'event-123', name: 'Test Event' },
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { user_id: 'existing-user', email: 'existing@example.com' },
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const response = await request(app)
        .post('/events/event-123/invite')
        .send({ email: 'existing@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
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

  describe('POST /events/invites/accept/:token', () => {
    it('should accept invite by token for email invite', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'event_invites') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      invite_id: 'invite-123',
                      event_id: 'event-123',
                      invited_email: 'test@example.com',
                      status: 'pending',
                    },
                    error: null,
                  }),
                })),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ error: null }),
            })),
          };
        } else if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { user_id: 'test-user-id', email: 'test@example.com' },
                  error: null,
                }),
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
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        } else if (table === 'splits') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .post('/events/invites/token/token-123/accept');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('accepted');
    });

    it('should fail if token email does not match current user', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'event_invites') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      invite_id: 'invite-123',
                      event_id: 'event-123',
                      invited_email: 'different@example.com',
                      status: 'pending',
                    },
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
                  data: { user_id: 'test-user-id', email: 'test@example.com' },
                  error: null,
                }),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .post('/events/invites/token/token-123/accept');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('different email');
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
