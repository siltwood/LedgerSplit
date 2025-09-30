import request from 'supertest';
import express from 'express';
import session from 'express-session';
import groupsRoutes from '../routes/groups';

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
  next();
});

app.use('/groups', groupsRoutes);

describe('Groups API', () => {
  describe('POST /groups', () => {
    it('should create a new group', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'groups') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    group_id: '123',
                    name: 'Trip to Hawaii',
                    description: 'Summer vacation',
                    created_by: 'test-user-id',
                  },
                  error: null,
                }),
              })),
            })),
          };
        } else if (table === 'group_members') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const response = await request(app)
        .post('/groups')
        .send({
          name: 'Trip to Hawaii',
          description: 'Summer vacation',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('group');
      expect(response.body.group.name).toBe('Trip to Hawaii');
    });
  });

  describe('POST /groups/:id/members', () => {
    it('should return 404 if user not found', async () => {
      const { db } = require('../config/database');

      db.from.mockImplementation((table: string) => {
        if (table === 'group_members') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({
                      data: { user_id: 'test-user-id' },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        } else if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              })),
            })),
          };
        }
      });

      const response = await request(app)
        .post('/groups/123/members')
        .send({
          email: 'nonexistent@example.com',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });
});