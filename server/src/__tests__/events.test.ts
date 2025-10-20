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

      let callCount = 0;
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
          callCount++;
          if (callCount === 1) {
            // First call: insert participant
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
            };
          } else {
            // Second call: select participants with user details
            return {
              select: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({
                  data: [{
                    user_id: 'test-user-id',
                    joined_at: new Date().toISOString(),
                    users: {
                      user_id: 'test-user-id',
                      name: 'Test User',
                      email: 'test@example.com',
                      avatar_url: null,
                    },
                  }],
                  error: null,
                }),
              })),
            };
          }
        } else if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
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
      expect(response.body.error).toBe('Event name is required.');
    });
  });

  describe('GET /events', () => {
    it('should return only events user is part of', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants' && db.from.mock.calls.length === 1) {
          // First call: Get events
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                is: jest.fn().mockResolvedValue({
                  data: [
                    { events: { event_id: 'event-123', name: 'Vegas Trip', created_at: new Date().toISOString(), is_settled: false } },
                    { events: { event_id: 'event-456', name: 'Concert', created_at: new Date().toISOString(), is_settled: false } },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'user_event_preferences') {
          // Second call: Get user preferences
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
        } else if (table === 'event_participants') {
          // Third call: Get all participants
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    event_id: 'event-123',
                    user_id: 'test-user-id',
                    joined_at: new Date().toISOString(),
                    users: { user_id: 'test-user-id', name: 'Test User', email: 'test@example.com', avatar_url: null }
                  },
                  {
                    event_id: 'event-456',
                    user_id: 'test-user-id',
                    joined_at: new Date().toISOString(),
                    users: { user_id: 'test-user-id', name: 'Test User', email: 'test@example.com', avatar_url: null }
                  },
                ],
                error: null,
              }),
            }),
          };
        } else if (table === 'splits') {
          // Fourth call: Get all splits
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
      });

      const response = await request(app).get('/events');

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(2);
      expect(response.body.events[0]).toHaveProperty('participants');
      expect(response.body.events[0]).toHaveProperty('is_dismissed');
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
      expect(response.body.error).toBe('Only event creator can delete.');
    });

    it('should handle database errors', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
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
          eq: jest.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        })),
      }));

      const response = await request(app).delete('/events/event-123');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /events/:id', () => {
    it('should get event by ID with participants', async () => {
      const { db } = require('../config/database');

      let callCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          callCount++;
          if (callCount === 1) {
            // Check participation
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
          } else {
            // Get participants
            return {
              select: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    { user_id: 'test-user-id', users: { name: 'Test User', email: 'test@example.com' } },
                  ],
                  error: null,
                }),
              })),
            };
          }
        } else if (table === 'events') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { event_id: 'event-123', name: 'Test Event' },
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
                data: [],
                error: null,
              }),
            })),
          };
        }
      });

      const response = await request(app).get('/events/event-123');

      expect(response.status).toBe(200);
      expect(response.body.event.name).toBe('Test Event');
      expect(response.body.participants).toBeDefined();
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

      const response = await request(app).get('/events/event-123');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not a participant of this event.');
    });

    it('should fail if event not found', async () => {
      const { db } = require('../config/database');

      let callCount = 0;
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
        } else if (table === 'events') {
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

      const response = await request(app).get('/events/event-123');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Event not found.');
    });
  });

  describe('PUT /events/:id', () => {
    it('should update event if user is creator', async () => {
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
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { event_id: 'event-123', name: 'Updated Event' },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .put('/events/event-123')
        .send({ name: 'Updated Event' });

      expect(response.status).toBe(200);
      expect(response.body.event.name).toBe('Updated Event');
    });

    it('should fail if user not creator', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
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
      }));

      const response = await request(app)
        .put('/events/event-123')
        .send({ name: 'Updated Event' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only event creator can update.');
    });
  });

  describe('DELETE /events/:eventId/participants/:userId', () => {
    it('should remove participant if user is creator', async () => {
      const { db } = require('../config/database');

      let splitsCallCount = 0;
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
          };
        } else if (table === 'splits') {
          splitsCallCount++;
          if (splitsCallCount === 1) {
            // First call: update splits
            return {
              update: jest.fn(() => ({
                eq: jest.fn(() => ({
                  or: jest.fn().mockResolvedValue({
                    error: null,
                  }),
                })),
              })),
            };
          } else {
            // Second call: select splits
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  is: jest.fn().mockResolvedValue({
                    data: [{ split_id: 'split-1' }],
                    error: null,
                  }),
                })),
              })),
            };
          }
        } else if (table === 'split_participants') {
          return {
            delete: jest.fn(() => ({
              in: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ error: null }),
              })),
            })),
          };
        } else if (table === 'event_settled_confirmations') {
          return {
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ error: null }),
              })),
            })),
          };
        } else if (table === 'event_participants') {
          return {
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ error: null }),
              })),
            })),
          };
        }
      });

      const response = await request(app).delete('/events/event-123/participants/user-to-remove');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Participant removed successfully (including their splits)');
    });

    it('should fail if user not creator', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
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
      }));

      const response = await request(app).delete('/events/event-123/participants/user-to-remove');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only event creator can remove participants.');
    });

    it('should fail if trying to remove creator', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
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
      }));

      const response = await request(app).delete('/events/event-123/participants/test-user-id');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot remove event creator.');
    });

    it('should handle database errors when removing participant', async () => {
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
          };
        } else if (table === 'splits') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                or: jest.fn().mockResolvedValue({
                  error: { message: 'Database error' },
                }),
              })),
            })),
          };
        }
      });

      const response = await request(app).delete('/events/event-123/participants/user-to-remove');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to remove participant splits.');
    });
  });

  describe('POST /events/:id/leave', () => {
    it('should allow non-creator to leave event', async () => {
      const { db } = require('../config/database');

      let splitsCallCount = 0;
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
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ error: null }),
              })),
            })),
          };
        } else if (table === 'events') {
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
        } else if (table === 'splits') {
          splitsCallCount++;
          if (splitsCallCount === 1) {
            // First call: update splits
            return {
              update: jest.fn(() => ({
                eq: jest.fn(() => ({
                  or: jest.fn().mockResolvedValue({
                    error: null,
                  }),
                })),
              })),
            };
          } else {
            // Second call: select splits
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  is: jest.fn().mockResolvedValue({
                    data: [{ split_id: 'split-1' }],
                    error: null,
                  }),
                })),
              })),
            };
          }
        } else if (table === 'split_participants') {
          return {
            delete: jest.fn(() => ({
              in: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ error: null }),
              })),
            })),
          };
        } else if (table === 'event_settled_confirmations') {
          return {
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ error: null }),
              })),
            })),
          };
        }
      });

      const response = await request(app).post('/events/event-123/leave');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Left event successfully (including your splits)');
    });

    it('should fail if creator tries to leave event', async () => {
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
        } else if (table === 'events') {
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
          };
        }
      });

      const response = await request(app).post('/events/event-123/leave');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Event creator cannot leave. Delete the event instead.');
    });

    it('should fail if user not a participant', async () => {
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

      const response = await request(app).post('/events/event-123/leave');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not a participant of this event.');
    });

    it('should handle database errors when leaving event', async () => {
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
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ error: { message: 'Database error' } }),
              })),
            })),
          };
        } else if (table === 'events') {
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
        } else if (table === 'splits') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                or: jest.fn().mockResolvedValue({
                  error: null,
                }),
              })),
            })),
          };
        }
      });

      const response = await request(app).post('/events/event-123/leave');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to leave event.');
    });

    it('should handle split deletion errors when leaving event', async () => {
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
        } else if (table === 'events') {
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
        } else if (table === 'splits') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                or: jest.fn().mockResolvedValue({
                  error: { message: 'Split deletion error' },
                }),
              })),
            })),
          };
        }
      });

      const response = await request(app).post('/events/event-123/leave');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to remove your splits.');
    });
  });

  describe('GET /join/:token', () => {
    it('should get event by share token', async () => {
      const { db } = require('../config/database');

      let callCount = 0;
      db.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1 || table === 'events') {
          // First call: Get event
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      event_id: 'event-123',
                      name: 'Test Event',
                      created_by: 'creator-123',
                      share_token: 'test-token',
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        } else {
          // Second call: Get creator
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { name: 'Creator Name' },
                  error: null,
                }),
              })),
            })),
          };
        }
      });

      const response = await request(app).get('/events/join/test-token');

      expect(response.status).toBe(200);
      expect(response.body.event.name).toBe('Test Event');
    });

    it('should fail if token invalid', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
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
      }));

      const response = await request(app).get('/events/join/invalid-token');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Event not found.');
    });
  });

  describe('POST /join/:token', () => {
    it('should join event by share token', async () => {
      const { db } = require('../config/database');

      let callCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      event_id: 'event-123',
                      name: 'Test Event',
                      share_token: 'test-token',
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        } else if (table === 'event_participants') {
          callCount++;
          if (callCount === 1) {
            // Check if already participant
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
          } else {
            // Insert new participant
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
            };
          }
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

      const response = await request(app).post('/events/join/test-token');

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Successfully joined event');
    });

    it('should fail if already participant', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      event_id: 'event-123',
                      share_token: 'test-token',
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
                    data: { event_id: 'event-123', user_id: 'test-user-id' },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app).post('/events/join/test-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Already a participant of this event.');
    });
  });

});
