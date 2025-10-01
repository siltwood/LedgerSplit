import request from 'supertest';
import express from 'express';
import session from 'express-session';
import groupsRoutes from '../routes/groups';
import { db } from '../config/database';

const app = express();
app.use(express.json());
app.use(
  session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use('/groups', groupsRoutes);

jest.mock('../config/database');

describe('Group Invites', () => {
  const mockUser1 = { id: 'user1', email: 'user1@test.com', name: 'User 1' };
  const mockUser2 = { id: 'user2', email: 'user2@test.com', name: 'User 2' };
  const mockGroup = { group_id: 'group1', name: 'Test Group', created_by: 'user1' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /groups/:id/invite', () => {
    it('should allow group member to send invite', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
          .mockResolvedValueOnce({ data: { is_active: true }, error: null }) // membership check
          .mockResolvedValueOnce({ data: mockUser2, error: null }), // find user
        insert: jest.fn().mockReturnThis(),
      });

      const res = await request(app)
        .post('/groups/group1/invite')
        .set('Cookie', 'connect.sid=test')
        .send({ email: 'user2@test.com' })
        .set('user', JSON.stringify(mockUser1));

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Invite sent successfully');
    });

    it('should prevent non-member from sending invite', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: 'Not found' }),
      });

      const res = await request(app)
        .post('/groups/group1/invite')
        .send({ email: 'user2@test.com' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Not a member of this group');
    });

    it('should prevent duplicate invites', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
          .mockResolvedValueOnce({ data: { is_active: true }, error: null }) // membership
          .mockResolvedValueOnce({ data: mockUser2, error: null }) // find user
          .mockResolvedValueOnce({ data: null, error: null }) // existing member check
          .mockResolvedValueOnce({ data: { invite_id: 'inv1', status: 'pending' }, error: null }), // existing invite
      });

      const res = await request(app)
        .post('/groups/group1/invite')
        .send({ email: 'user2@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invite already sent');
    });

    it('should reject invite to existing member', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
          .mockResolvedValueOnce({ data: { is_active: true }, error: null }) // membership
          .mockResolvedValueOnce({ data: mockUser2, error: null }) // find user
          .mockResolvedValueOnce({ data: { is_active: true }, error: null }), // existing member
      });

      const res = await request(app)
        .post('/groups/group1/invite')
        .send({ email: 'user2@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('User already in group');
    });
  });

  describe('GET /groups/invites', () => {
    it('should return pending invites for user', async () => {
      const mockInvites = [
        {
          invite_id: 'inv1',
          group_id: 'group1',
          groups: { name: 'Test Group' },
          inviter: { name: 'User 1' },
        },
      ];

      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockInvites, error: null }),
      });

      const res = await request(app).get('/groups/invites');

      expect(res.status).toBe(200);
      expect(res.body.invites).toHaveLength(1);
    });
  });

  describe('POST /groups/invites/:inviteId/accept', () => {
    it('should accept invite and add user to group', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { invite_id: 'inv1', group_id: 'group1', invited_user: 'user2' },
          error: null,
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockReturnThis(),
      });

      const res = await request(app)
        .post('/groups/invites/inv1/accept');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Invite accepted successfully');
    });

    it('should prevent accepting invite for another user', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: 'Not found' }),
      });

      const res = await request(app)
        .post('/groups/invites/inv1/accept');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Invite not found');
    });
  });

  describe('POST /groups/invites/:inviteId/decline', () => {
    it('should decline invite', async () => {
      (db.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { invite_id: 'inv1', invited_user: 'user2' },
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
      });

      const res = await request(app)
        .post('/groups/invites/inv1/decline');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Invite declined');
    });
  });
});
