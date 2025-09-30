# Bill Splitting App - API Documentation

Base URL: `http://localhost:3001/api`

## Authentication

### Register
```
POST /auth/register
Body: { email, password, name }
Response: { user }
```

### Login
```
POST /auth/login
Body: { email, password }
Response: { user }
```

### Google OAuth
```
GET /auth/google
Response: { url }

GET /auth/google/callback?code=...
Redirects to client
```

### Get Current User
```
GET /auth/me
Response: { user }
```

### Logout
```
POST /auth/logout
Response: { message }
```

---

## Groups

### Get All Groups
```
GET /groups
Response: { groups }
```

### Get Group by ID
```
GET /groups/:id
Response: { group, members }
```

### Create Group
```
POST /groups
Body: { name, description? }
Response: { group }
```

### Update Group
```
PUT /groups/:id
Body: { name, description }
Response: { group }
```

### Delete Group
```
DELETE /groups/:id
Response: { message }
```

### Add Member
```
POST /groups/:id/members
Body: { email }
Response: { message }
```

### Remove Member
```
DELETE /groups/:id/members/:userId
Response: { message }
```

---

## Expenses

### Get Expenses
```
GET /expenses?group_id=...&user_id=...
Response: { expenses }
```

### Get Expense by ID
```
GET /expenses/:id
Response: { expense }
```

### Create Expense
```
POST /expenses
Body: {
  group_id?,
  description,
  amount,
  currency?,
  paid_by,
  date,
  notes?,
  splits: [{ user_id, amount_owed }]
}
Response: { expense }
```

### Update Expense
```
PUT /expenses/:id
Body: { description, amount, currency, paid_by, date, notes, splits? }
Response: { expense }
```

### Delete Expense (Soft Delete)
```
DELETE /expenses/:id
Response: { message }
```

### Restore Expense
```
POST /expenses/:id/restore
Response: { message }
```

---

## Settlements

### Get Settlements
```
GET /settlements?group_id=...&user_id=...
Response: { settlements }
```

### Create Settlement
```
POST /settlements
Body: {
  group_id?,
  paid_by,
  paid_to,
  amount,
  currency?,
  date?,
  notes?
}
Response: { settlement }
```

---

## Friends

### Get Friends
```
GET /friends
Response: { friends }
```

### Get Pending Requests
```
GET /friends/pending
Response: { incoming, outgoing }
```

### Send Friend Request
```
POST /friends/invite
Body: { email }
Response: { message, friendRequest }
```

### Accept Friend Request
```
PUT /friends/:id/accept
Response: { message }
```

### Remove Friend
```
DELETE /friends/:id
Response: { message }
```

---

## Balances

### Get User Balance
```
GET /balances/user/:userId
Response: {
  userId,
  totalBalance,
  owes: [{ user, amount }],
  owedBy: [{ user, amount }]
}
```

### Get Balance Between Two Users
```
GET /balances/between/:userId1/:userId2
Response: {
  user1,
  user2,
  balance,
  summary
}
```

### Get Group Balances
```
GET /balances/group/:groupId
Response: {
  groupId,
  balances: [{ debtor, creditor, amount, summary }]
}
```

---

## Upload

### Upload Receipt
```
POST /upload/receipt
Content-Type: multipart/form-data
Body: FormData with 'receipt' field
Response: { message, url, filename }
```

Allowed file types: JPEG, PNG, PDF
Max file size: 5MB

---

## Notes

- All endpoints (except auth registration/login) require authentication
- Sessions are managed via cookies
- Files are served from `/uploads/receipts/`
- Balance calculation uses exact debt tracking (no simplification)