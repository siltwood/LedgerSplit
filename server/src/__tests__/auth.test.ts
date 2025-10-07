import request from 'supertest';
import express from 'express';
import session from 'express-session';
import authRoutes from '../routes/auth';

// Mock the database
jest.mock('../config/database', () => ({
  db: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  },
}));

// Mock Google client
jest.mock('../config/google', () => ({
  googleClient: {
    generateAuthUrl: jest.fn(),
    getToken: jest.fn(),
    setCredentials: jest.fn(),
    verifyIdToken: jest.fn(),
  },
}));

// Mock email service
jest.mock('../services/email', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendFriendInviteEmail: jest.fn().mockResolvedValue(true),
  sendEventInviteEmail: jest.fn().mockResolvedValue(true),
}));

const app = express();
app.use(express.json());
app.use(
  session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                user_id: '123',
                email: 'test@example.com',
                name: 'Test User',
              },
              error: null,
            }),
          })),
        })),
      }));

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 400 if password is less than 6 characters', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: '12345',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password must be at least 6 characters');
    });

    it('should return 400 if email already exists', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { email: 'test@example.com' },
              error: null,
            }),
          })),
        })),
      }));

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already registered');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const bcrypt = require('bcrypt');
      const { db } = require('../config/database');

      const hashedPassword = await bcrypt.hash('password123', 10);

      db.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                user_id: '123',
                email: 'test@example.com',
                name: 'Test User',
                password_hash: hashedPassword,
              },
              error: null,
            }),
          })),
        })),
      }));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.message).toBe('Login successful');
    });

    it('should return 401 for invalid credentials', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          })),
        })),
      }));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 400 if user registered with Google', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                user_id: '123',
                email: 'google@example.com',
                name: 'Google User',
                google_id: 'google-123',
                password_hash: null,
              },
              error: null,
            }),
          })),
        })),
      }));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'google@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Please login with Google');
    });
  });

  describe('POST /auth/register with pending invites', () => {
    it('should auto-accept pending email invites on registration', async () => {
      const { db } = require('../config/database');

      let fromCallCount = 0;
      db.from.mockImplementation((table: string) => {
        fromCallCount++;

        if (table === 'users' && fromCallCount === 1) {
          // Check if user exists
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          };
        } else if (table === 'users' && fromCallCount === 2) {
          // Create user
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    user_id: '123',
                    email: 'newuser@example.com',
                    name: 'New User',
                  },
                  error: null,
                }),
              })),
            })),
          };
        } else if (table === 'event_invites' && fromCallCount === 3) {
          // Get pending invites
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  mockResolvedValue: jest.fn().mockResolvedValue({
                    data: [
                      {
                        invite_id: 'invite-1',
                        event_id: 'event-1',
                        invited_email: 'newuser@example.com',
                      },
                    ],
                    error: null,
                  }),
                })),
              })),
            })),
          };
        } else if (table === 'event_invites' && fromCallCount === 4) {
          // Update invite to accepted
          return {
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ error: null }),
            })),
          };
        } else if (table === 'event_participants') {
          // Add user to event
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        } else if (table === 'splits') {
          // Get splits for event
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn().mockResolvedValue({
                  data: [{ split_id: 'split-1', amount: 100 }],
                  error: null,
                }),
              })),
            })),
          };
        } else if (table === 'split_participants') {
          // Mock split participants operations
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
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('newuser@example.com');
    });
  });

  describe('GET /auth/google', () => {
    it('should return Google OAuth URL', async () => {
      const { googleClient } = require('../config/google');

      googleClient.generateAuthUrl = jest.fn().mockReturnValue(
        'https://accounts.google.com/o/oauth2/v2/auth?...'
      );

      const response = await request(app).get('/auth/google');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
      expect(response.body.url).toContain('google.com');
    });
  });

  describe('GET /auth/google/callback', () => {
    it('should create new user and redirect on successful Google auth', async () => {
      const { googleClient } = require('../config/google');
      const { db } = require('../config/database');

      googleClient.getToken = jest.fn().mockResolvedValue({
        tokens: { id_token: 'mock-token' },
      });

      googleClient.verifyIdToken = jest.fn().mockResolvedValue({
        getPayload: () => ({
          sub: 'google-123',
          email: 'newuser@gmail.com',
          name: 'Google User',
        }),
      });

      let dbCallCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'users') {
          dbCallCount++;
          if (dbCallCount === 1) {
            // Check by email
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            };
          } else if (dbCallCount === 2) {
            // Check by google_id
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            };
          } else {
            // Insert new user
            return {
              insert: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      user_id: '123',
                      email: 'newuser@gmail.com',
                      name: 'Google User',
                      google_id: 'google-123',
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }
        } else if (table === 'event_invites') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  mockResolvedValue: jest.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .get('/auth/google/callback')
        .query({ code: 'auth-code' });

      expect(response.status).toBe(302); // Redirect
      expect(response.header.location).toContain('/dashboard');
    });

    it('should login existing Google user', async () => {
      const { googleClient } = require('../config/google');
      const { db } = require('../config/database');

      googleClient.getToken = jest.fn().mockResolvedValue({
        tokens: { id_token: 'mock-token' },
      });

      googleClient.verifyIdToken = jest.fn().mockResolvedValue({
        getPayload: () => ({
          sub: 'google-123',
          email: 'existing@gmail.com',
          name: 'Existing User',
        }),
      });

      let dbCallCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'users') {
          dbCallCount++;
          if (dbCallCount === 1) {
            // Check by email
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      user_id: '123',
                      email: 'existing@gmail.com',
                      google_id: 'google-123',
                    },
                    error: null,
                  }),
                })),
              })),
            };
          } else {
            // Check by google_id
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      user_id: '123',
                      email: 'existing@gmail.com',
                      google_id: 'google-123',
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }
        } else if (table === 'event_invites') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  mockResolvedValue: jest.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .get('/auth/google/callback')
        .query({ code: 'auth-code' });

      expect(response.status).toBe(302);
      expect(response.header.location).toContain('/dashboard');
    });

    it('should redirect with error if email already registered with password', async () => {
      const { googleClient } = require('../config/google');
      const { db } = require('../config/database');

      googleClient.getToken = jest.fn().mockResolvedValue({
        tokens: { id_token: 'mock-token' },
      });

      googleClient.verifyIdToken = jest.fn().mockResolvedValue({
        getPayload: () => ({
          sub: 'google-123',
          email: 'existing@example.com',
          name: 'Password User',
        }),
      });

      db.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                user_id: '123',
                email: 'existing@example.com',
                password_hash: 'hashed-password',
                google_id: null,
              },
              error: null,
            }),
          })),
        })),
      }));

      const response = await request(app)
        .get('/auth/google/callback')
        .query({ code: 'auth-code' });

      expect(response.status).toBe(302);
      expect(response.header.location).toContain('error=email_exists');
    });

    it('should return 400 if authorization code is missing', async () => {
      const response = await request(app).get('/auth/google/callback');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Authorization code missing');
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should create password reset token and send email', async () => {
      const { db } = require('../config/database');
      const { sendPasswordResetEmail } = require('../services/email');

      db.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    user_id: '123',
                    email: 'user@example.com',
                    name: 'Test User',
                    password_hash: 'hashed',
                  },
                  error: null,
                }),
              })),
            })),
          };
        } else if (table === 'password_reset_tokens') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    token: 'reset-token-123',
                    user_id: '123',
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('sent');
      expect(sendPasswordResetEmail).toHaveBeenCalledWith('user@example.com', 'reset-token-123');
    });

    it('should return generic message if user not found (prevent enumeration)', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          })),
        })),
      }));

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('sent');
    });

    it('should return generic message for Google OAuth users (prevent enumeration)', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                user_id: '123',
                email: 'user@example.com',
                google_id: 'google-123',
              },
              error: null,
            }),
          })),
        })),
      }));

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('sent');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const { db } = require('../config/database');

      let tokenCallCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'password_reset_tokens') {
          tokenCallCount++;
          if (tokenCallCount === 1) {
            // First call: find valid token
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    gt: jest.fn(() => ({
                      single: jest.fn().mockResolvedValue({
                        data: {
                          token: 'valid-token',
                          user_id: '123',
                          used: false,
                          expires_at: new Date(Date.now() + 3600000).toISOString(),
                        },
                        error: null,
                      }),
                    })),
                  })),
                })),
              })),
            };
          } else {
            // Second call: mark token as used
            return {
              update: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ error: null }),
              })),
            };
          }
        } else if (table === 'users') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
      });

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'valid-token',
          newPassword: 'newpassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('reset');
    });

    it('should reject expired token', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              gt: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              })),
            })),
          })),
        })),
      }));

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'expired-token',
          newPassword: 'newpassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('expired');
    });

    it('should reject already used token', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              gt: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              })),
            })),
          })),
        })),
      }));

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'used-token',
          newPassword: 'newpassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid');
    });
  });
});
