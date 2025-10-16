import request from 'supertest';
import express from 'express';

jest.mock('../config/database');

// Test UUIDs
const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174001';
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

describe('Splits API - Category Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /splits with category', () => {
    it('should create split with food category', async () => {
      const { db } = require('../config/database');

      let selectCallCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => {
              selectCallCount++;
              if (selectCallCount <= 2) {
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
                    title: 'Restaurant',
                    amount: 85.50,
                    paid_by: TEST_USER_ID,
                    category: 'food',
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
          title: 'Restaurant',
          amount: 85.50,
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          category: 'food',
          participant_ids: [],
        });

      expect(response.status).toBe(201);
      expect(response.body.split.category).toBe('food');
    });

    it('should create split with transportation category', async () => {
      const { db } = require('../config/database');

      let selectCallCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => {
              selectCallCount++;
              if (selectCallCount <= 2) {
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
                    title: 'Uber to airport',
                    amount: 45,
                    paid_by: TEST_USER_ID,
                    category: 'transportation',
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
          title: 'Uber to airport',
          amount: 45,
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          category: 'transportation',
          participant_ids: [],
        });

      expect(response.status).toBe(201);
      expect(response.body.split.category).toBe('transportation');
    });

    it('should create split without category (optional field)', async () => {
      const { db } = require('../config/database');

      let selectCallCount = 0;
      db.from.mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn(() => {
              selectCallCount++;
              if (selectCallCount <= 2) {
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
                    title: 'Miscellaneous',
                    amount: 20,
                    paid_by: TEST_USER_ID,
                    category: null,
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
          title: 'Miscellaneous',
          amount: 20,
          paid_by: TEST_USER_ID,
          date: '2025-01-01',
          participant_ids: [],
        });

      expect(response.status).toBe(201);
      expect(response.body.split).toHaveProperty('split_id');
    });

    it('should create split with all valid categories', async () => {
      const categories = ['food', 'transportation', 'lodging', 'entertainment', 'groceries', 'other'];

      for (const category of categories) {
        const { db } = require('../config/database');

        let selectCallCount = 0;
        db.from.mockImplementation((table: string) => {
          if (table === 'event_participants') {
            return {
              select: jest.fn(() => {
                selectCallCount++;
                if (selectCallCount <= 2) {
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
                      title: `Test ${category}`,
                      amount: 50,
                      paid_by: TEST_USER_ID,
                      category: category,
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
            title: `Test ${category}`,
            amount: 50,
            paid_by: TEST_USER_ID,
            date: '2025-01-01',
            category: category,
            participant_ids: [],
          });

        expect(response.status).toBe(201);
        expect(response.body.split.category).toBe(category);
      }
    });
  });

  describe('PUT /splits/:id with category', () => {
    it('should update split category', async () => {
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
                      category: 'food',
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
                    data: {
                      split_id: TEST_SPLIT_ID,
                      title: 'Updated Dinner',
                      category: 'entertainment',
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
          category: 'entertainment',
        });

      expect(response.status).toBe(200);
      expect(response.body.split.category).toBe('entertainment');
    });

    it('should allow removing category by setting to null', async () => {
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
                      category: 'food',
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
                    data: {
                      split_id: TEST_SPLIT_ID,
                      category: null,
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
          category: null,
        });

      expect(response.status).toBe(200);
    });
  });
});
