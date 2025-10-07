# Security Fixes Applied

## Summary
This branch contains comprehensive security improvements to the LedgerSplit application. All tests need to be updated to account for new validation requirements.

## Critical Fixes (High Priority)

### 1. **CORS Misconfiguration** ✅
- **Issue**: Only allowed one origin via `CLIENT_URL` env var
- **Fix**: Now supports multiple origins (localhost, ledgersplit.com, www.ledgersplit.com)
- **Location**: `server/src/index.ts:52-73`
- **Impact**: Google OAuth will now work on both www and non-www domains

### 2. **Session Secret Enforcement** ✅
- **Issue**: Had default fallback `'your-secret-key'`
- **Fix**: Server now fails to start if `SESSION_SECRET` not set
- **Location**: `server/src/index.ts:80-83`
- **Impact**: **BREAKING** - Must set `SESSION_SECRET` in production env

## Medium Priority Fixes

### 3. **Input Validation & Sanitization** ✅
- **Issue**: No validation library, manual checks only
- **Fix**: Created `utils/validation.ts` with comprehensive validators
- **Added**:
  - Email format validation
  - Password strength (8-128 chars, was 6+)
  - Name sanitization (strips HTML, 100 char limit)
  - Amount validation (positive numbers, < 1M)
  - Text sanitization for descriptions/notes
  - UUID validation
- **Location**: `server/src/utils/validation.ts`
- **Impact**: **BREAKING** - Password now requires 8 chars minimum (was 6)

### 4. **Rate Limiting on Auth Routes** ✅
- **Issue**: No rate limiting on login/register endpoints
- **Fix**: Added strict limiter (5 attempts per 15 min in prod)
- **Location**: `server/src/index.ts:52-60`
- **Impact**: Prevents brute force attacks

### 5. **Request Size Limits** ✅
- **Issue**: No payload size limits
- **Fix**: Added 10MB limit to JSON/urlencoded bodies
- **Location**: `server/src/index.ts:76-77`
- **Impact**: Prevents payload DoS attacks

### 6. **Session Regeneration** ✅
- **Issue**: Session fixation vulnerability
- **Fix**: Regenerate session ID on login/register
- **Location**:
  - `authController.ts:149-178` (register)
  - `authController.ts:221-247` (login)
  - `authController.ts:348-379` (Google OAuth)
- **Impact**: Prevents session fixation attacks

### 7. **Google OAuth CSRF Protection** ✅
- **Issue**: No state parameter validation
- **Fix**: Generate and validate state parameter
- **Location**: `authController.ts:255-272` (generate), `authController.ts:283-288` (validate)
- **Impact**: Prevents CSRF during OAuth flow

### 8. **Password Reset Token Cleanup** ✅
- **Issue**: Expired tokens never deleted
- **Fix**: Created cleanup scheduler (runs every hour)
- **Location**: `server/src/utils/cleanup.ts`
- **Impact**: Reduces database bloat

### 9. **Participant Manipulation** ✅
- **Issue**: Could add arbitrary users to events without consent
- **Fix**: Validate UUIDs and verify users exist before adding
- **Location**: `eventsController.ts:118-139`
- **Impact**: Users can't be added to events without proper verification

### 10. **Email Validation** ✅
- **Issue**: No email format checking
- **Fix**: Using `validator` library for proper email validation
- **Location**: `authController.ts:102-104`, `authController.ts:194-196`
- **Impact**: Prevents invalid emails from registration

## Low Priority / Nice-to-Have

### 11. **Enhanced Sanitization**
- All user-provided text (names, descriptions, notes, titles) now sanitized
- HTML tags stripped
- Length limits enforced

## Test Failures

The following tests are failing due to stricter validation:

1. **splits.test.ts**:
   - Tests using non-UUID event IDs (e.g., 'event-123')
   - **Fix needed**: Use proper UUID format in tests

2. **auth.test.ts**:
   - Mock database needs to be updated for new validation flow

## TODO Before Merge

- [ ] Update all tests to use valid UUIDs
- [ ] Update tests to handle new validation errors
- [ ] Add tests for new validation utilities
- [ ] Update `.env.example` to emphasize `SESSION_SECRET` requirement
- [ ] Document password change from 6 to 8 characters in migration notes
- [ ] Test OAuth flow with state parameter in production
- [ ] Verify rate limiting doesn't affect normal users

## Deployment Checklist

1. Set `SESSION_SECRET` env var (use `openssl rand -base64 32`)
2. Update Google OAuth redirect URIs to include www subdomain
3. Run database cleanup for old tokens: `DELETE FROM password_reset_tokens WHERE expires_at < NOW()`
4. Monitor rate limiting logs for false positives
5. Test both www and non-www domains

## Dependencies Added

```json
{
  "validator": "^13.x.x",
  "express-validator": "^7.x.x"
}
```

```json
{
  "@types/validator": "^13.x.x"
}
```

## Breaking Changes

1. **Minimum password length**: 6 → 8 characters
2. **SESSION_SECRET required**: Server won't start without it
3. **Stricter validation**: Invalid UUIDs, emails, amounts now rejected
4. **Rate limiting**: Auth endpoints limited to 5 attempts per 15 min

## Notes

- CSRF protection via OAuth state parameter (considered sufficient given session-based auth with sameSite: 'lax')
- Did not add full CSRF token system as it would require client-side changes
- Google OAuth callback now uses hardcoded www.ledgersplit.com for consistency
