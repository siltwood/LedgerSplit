# Test Fixes Needed

The security improvements have made tests fail due to stricter validation. Here's what needs to be fixed:

## Failing Tests

### `splits.test.ts`

**Problem**: Using fake IDs like `'event-123'`, `'user-1'`, etc. instead of valid UUIDs

**Failing Tests**:
1. "should create split with equal amounts"
2. "should allow creating split with 0 participants"
3. "should fail if user not participant of event"

**Fix**: Replace all fake IDs with valid UUIDs

**Example**:
```typescript
// Before
event_id: 'event-123',
paid_by: 'test-user-id',

// After
const validEventId = '123e4567-e89b-12d3-a456-426614174000';
const validUserId = '123e4567-e89b-12d3-a456-426614174001';

event_id: validEventId,
paid_by: validUserId,
```

### `auth.test.ts`

**Problem**: Mock database chain broken - `.eq(...).eq(...)` not working

**Error**:
```
TypeError: database_1.db.from(...).select(...).eq(...).eq is not a function
```

**Fix**: Update mock to support chained `.eq()` calls

**Example**:
```typescript
// Mock needs to return proper chain for event_invites query
if (table === 'event_invites') {
  return {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({ // Second eq() was missing
          data: [...],
          error: null
        }))
      }))
    }))
  };
}
```

## Quick Fix Script

You can use this to generate valid UUIDs for tests:

```bash
node -e "console.log(require('crypto').randomUUID())"
```

Or use these pre-generated UUIDs:

```typescript
const TEST_UUIDS = {
  eventId: '123e4567-e89b-12d3-a456-426614174000',
  userId1: '123e4567-e89b-12d3-a456-426614174001',
  userId2: '123e4567-e89b-12d3-a456-426614174002',
  splitId: '123e4567-e89b-12d3-a456-426614174003',
  payerId: '123e4567-e89b-12d3-a456-426614174004',
};
```

## Files to Update

1. `server/src/__tests__/splits.test.ts` - Replace all fake IDs with UUIDs
2. `server/src/__tests__/auth.test.ts` - Fix event_invites mock chain
3. `server/src/__tests__/events.test.ts` - May need UUID updates too

## Validation Changes to Account For

1. **Email validation**: Tests now need valid email format
2. **Password length**: Min 8 chars (was 6)
3. **UUID validation**: All IDs must be valid UUID v4 format
4. **Amount validation**: Must be positive number < 1,000,000
5. **Text sanitization**: HTML tags will be stripped

## Running Tests After Fix

```bash
npm test
```

All tests should pass once IDs are replaced with valid UUIDs.
