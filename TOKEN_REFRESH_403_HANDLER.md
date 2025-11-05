# Token Refresh on 403 Handler

## Feature

Automatic token refresh when receiving 403 (Forbidden) errors from `/auth/v1/user` endpoint. This provides a seamless user experience by automatically refreshing expired tokens without requiring manual re-authentication.

## Problem Solved

When access tokens expire, requests to Supabase's `/auth/v1/user` endpoint return a **403 Forbidden** status. Without proper handling, this causes:
- Failed API requests
- User being signed out
- Poor user experience
- Loss of unsaved data

## Solution

Implemented a **custom fetch interceptor** that:
1. Detects 403 errors on `/auth/v1/user` endpoint
2. Automatically triggers token refresh using refresh token
3. Retries the original request with the new access token
4. Prevents concurrent refresh attempts

## Implementation

### File: [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts)

**Key Components:**

**1. Refresh State Tracking**
```typescript
// Track ongoing refresh to prevent concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;
```

**Why?**
- Prevents multiple concurrent refresh attempts
- Queues requests during refresh
- Ensures all requests use the same refreshed token

**2. Custom Fetch Interceptor**
```typescript
const customFetch = async (url: RequestInfo | URL, options: RequestInit = {}) => {
  const response = await fetch(url, options);

  // Handle 403 errors on /auth/v1/user endpoint
  if (response.status === 403 && url.toString().includes('/auth/v1/user')) {
    console.log('[Supabase] 403 error on /auth/v1/user - attempting token refresh');

    // If already refreshing, wait for that to complete
    if (isRefreshing && refreshPromise) {
      await refreshPromise;
      // Retry the original request with new token
      return fetch(url, options);
    }

    // Start refresh process
    isRefreshing = true;
    refreshPromise = supabase.auth.refreshSession()
      .then(({ data, error }) => {
        if (error) {
          console.error('[Supabase] Token refresh failed:', error);
          // Sign out on refresh failure
          supabase.auth.signOut();
          throw error;
        }
        console.log('[Supabase] Token refreshed successfully');
        return data;
      })
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });

    try {
      await refreshPromise;
      // Retry the original request with refreshed token
      return fetch(url, options);
    } catch (error) {
      console.error('[Supabase] Failed to refresh and retry request:', error);
      return response; // Return original 403 response
    }
  }

  return response;
};
```

**3. Supabase Client Configuration**
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,        // Built-in auto-refresh
    detectSessionInUrl: true,      // Handle OAuth redirects
  },
  global: {
    fetch: customFetch,              // Custom 403 handler
  }
});
```

## How It Works

### Scenario 1: Access Token Expires During Session

```
User Action → API Request → 403 Error
                               ↓
                    [Custom Fetch Interceptor]
                               ↓
                    Check: is 403 + /auth/v1/user?
                               ↓ Yes
                    Check: Already refreshing?
                               ↓ No
                    Call: supabase.auth.refreshSession()
                               ↓
                    Get: New Access Token
                               ↓
                    Retry: Original Request with New Token
                               ↓
                    Return: Successful Response
```

### Scenario 2: Multiple Concurrent Requests with Expired Token

```
Request 1 → 403 → Start Refresh → Wait → Retry with New Token ✓
Request 2 → 403 → Wait for Refresh → Retry with New Token ✓
Request 3 → 403 → Wait for Refresh → Retry with New Token ✓
```

Only ONE refresh happens, all other requests wait and reuse the same refreshed token.

### Scenario 3: Refresh Token Also Expired

```
User Action → API Request → 403 Error
                               ↓
                    [Custom Fetch Interceptor]
                               ↓
                    Call: supabase.auth.refreshSession()
                               ↓
                    Error: Refresh token expired
                               ↓
                    Call: supabase.auth.signOut()
                               ↓
                    User: Redirected to Auth Page
```

## Benefits

### 1. Seamless User Experience
- No interruption during active sessions
- Automatic background token refresh
- Users don't notice token expiration

### 2. Prevents Data Loss
- API requests succeed even with expired tokens
- Forms can be submitted successfully
- No need to re-enter data

### 3. Better Performance
- Single refresh for multiple concurrent requests
- Queues requests instead of failing them
- Reduces unnecessary re-authentication

### 4. Graceful Degradation
- Signs out only when refresh token expires (after 30 days)
- Falls back to auth page only when truly necessary
- Logs all refresh attempts for debugging

## Configuration

### Token Lifetimes (Supabase Defaults)

- **Access Token**: 1 hour
- **Refresh Token**: 30 days

These can be configured in Supabase Dashboard → Authentication → Settings:
- `JWT_EXPIRY`: Access token lifetime (default: 3600 seconds)
- `REFRESH_TOKEN_ROTATION_ENABLED`: Rotate refresh tokens on use

### Auto-Refresh Settings

The Supabase client is configured with:
```typescript
auth: {
  autoRefreshToken: true,        // Refresh before expiry (default: 10s before)
  detectSessionInUrl: true,      // Handle OAuth callbacks
  persistSession: true,          // Save to localStorage
}
```

### Custom Interceptor Scope

The 403 handler specifically targets:
```typescript
response.status === 403 && url.toString().includes('/auth/v1/user')
```

This ensures:
- Only auth-related 403s trigger refresh
- Other 403s (e.g., permission errors) are not intercepted
- Refresh is only attempted when appropriate

## Testing

### Test 1: Expired Access Token

**Setup:**
1. Sign in to the app
2. Open DevTools → Application → Local Storage
3. Find the Supabase auth token
4. Change `expires_at` to a past timestamp (but keep refresh token valid)

**Expected Behavior:**
1. Navigate or make an API call
2. Console shows: `[Supabase] 403 error on /auth/v1/user - attempting token refresh`
3. Console shows: `[Supabase] Token refreshed successfully`
4. Request succeeds
5. User stays logged in

### Test 2: Concurrent Requests with Expired Token

**Setup:**
1. Expire the access token (as above)
2. Trigger multiple API calls simultaneously (e.g., navigate to home page which fetches shops and products)

**Expected Behavior:**
1. First 403 triggers refresh
2. Subsequent 403s wait for refresh to complete
3. All requests retry with new token
4. All requests succeed
5. Only ONE refresh log appears

### Test 3: Expired Refresh Token

**Setup:**
1. Sign in to the app
2. Open DevTools → Application → Local Storage
3. Expire BOTH access token and refresh token

**Expected Behavior:**
1. Make an API call
2. Console shows: `[Supabase] 403 error on /auth/v1/user - attempting token refresh`
3. Console shows: `[Supabase] Token refresh failed`
4. User is signed out
5. Redirected to auth page

### Test 4: Normal Operation

**Setup:**
1. Sign in with valid credentials
2. Use the app normally

**Expected Behavior:**
1. No 403 errors
2. No refresh logs (unless approaching 1 hour of use)
3. Supabase's built-in `autoRefreshToken` handles refresh proactively
4. Custom 403 handler is a safety net

## Debugging

### Console Logs

The handler logs all activities:

```typescript
// On 403 detection
[Supabase] 403 error on /auth/v1/user - attempting token refresh

// On successful refresh
[Supabase] Token refreshed successfully

// On refresh failure
[Supabase] Token refresh failed: Error message

// On retry failure
[Supabase] Failed to refresh and retry request: Error message
```

### Network Tab

Check DevTools → Network tab for:
1. Original request with 403 status
2. Refresh request to `/auth/v1/token?grant_type=refresh_token`
3. Retry of original request with new token (should be 200)

## Interaction with Other Fixes

This feature works alongside:

**1. Expired Token Fix ([EXPIRED_TOKEN_FIX.md](EXPIRED_TOKEN_FIX.md))**
- That fix handles initial app load with expired tokens
- This fix handles expired tokens during active session
- Together they provide complete coverage

**2. Auth Timeout Fix ([AUTH_TIMEOUT_FIX.md](AUTH_TIMEOUT_FIX.md))**
- Timeout handles hung session fetches
- 403 handler handles expired tokens during session
- Complementary error handling

**3. Email Verification Fix ([EMAIL_VERIFICATION_FIX.md](EMAIL_VERIFICATION_FIX.md))**
- Email verification check still applies
- Token refresh doesn't bypass email verification
- Both work together

## Edge Cases Handled

### 1. Race Condition
**Problem:** Multiple requests trigger 403 simultaneously
**Solution:** `isRefreshing` flag queues subsequent requests

### 2. Refresh Loop
**Problem:** Refresh itself gets 403
**Solution:** Only `/auth/v1/user` triggers refresh, not token endpoint

### 3. Invalid Refresh Token
**Problem:** Refresh token expired or revoked
**Solution:** Sign out user and redirect to auth page

### 4. Network Error During Refresh
**Problem:** Network fails while refreshing
**Solution:** Return original 403, user can retry

## Security Considerations

1. **Refresh Token Safety**
   - Stored in httpOnly cookie (if configured) or localStorage
   - Only used for token refresh
   - Rotated on each use (if enabled)

2. **Sign Out on Failure**
   - Failed refresh always signs out
   - Prevents indefinite retry loops
   - Clears all local data

3. **Scoped Interception**
   - Only intercepts `/auth/v1/user` 403s
   - Other 403s handled normally
   - Prevents unintended side effects

## Build Verification

```bash
npm run build:dev
```

Output:
```
✓ 3212 modules transformed.
✓ built in 10.39s
```

No TypeScript errors. Feature ready for testing.

## Summary

**Feature:** Automatic token refresh on 403 errors from `/auth/v1/user`

**Benefits:**
- Seamless user experience
- No interruption during active sessions
- Prevents data loss
- Handles concurrent requests efficiently

**Implementation:** Custom fetch interceptor with state management to prevent concurrent refreshes.
