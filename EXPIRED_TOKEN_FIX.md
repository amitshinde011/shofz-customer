# Expired Token Fix

## Problem

When users returned to the app after several hours or a day, the screen would get stuck on a loading spinner indefinitely. The app would only work after manually deleting the auth token from localStorage.

### Symptoms
- Infinite loading spinner on app startup
- No error messages in UI
- Console shows session fetch attempts but no resolution
- Only fix was to manually clear localStorage

## Root Cause

The authentication system wasn't properly handling **expired access tokens**:

1. **Expired tokens in localStorage**: Supabase stores auth tokens in localStorage, which can expire after a certain period (default: 1 hour for access tokens)
2. **No error handling**: When `supabase.auth.getSession()` was called with an expired token, errors weren't being caught
3. **No timeout**: If the session fetch hung, there was no timeout to break out of the loading state
4. **No cleanup**: Failed session fetches didn't clear the invalid token, so subsequent loads would retry with the same expired token

## Solution

### 1. Added Session Fetch Timeout

Added a 5-second timeout to prevent infinite loading:

```typescript
// Get initial session with timeout and error handling
const sessionTimeout = setTimeout(() => {
  if (mounted && authState.loading) {
    console.warn('[AuthContext] Session load timeout - clearing auth state');
    clearUserProfileFromStorage();
    setAuthState({
      user: null,
      session: null,
      loading: false,
    });
  }
}, 5000); // 5 second timeout
```

**Why 5 seconds?**
- Network requests should complete within 2-3 seconds
- Allows for slow connections
- Prevents indefinite hanging
- Users see the auth screen rather than infinite spinner

### 2. Added Error Handling for Session Fetch

Wrapped `getSession()` with proper error handling:

```typescript
supabase.auth.getSession()
  .then(({ data: { session }, error }) => {
    clearTimeout(sessionTimeout);

    if (error) {
      console.error('[AuthContext] Session fetch error:', error);
      // Clear expired/invalid session
      supabase.auth.signOut();
      clearUserProfileFromStorage();
      if (mounted) {
        setAuthState({ user: null, session: null, loading: false });
      }
      return;
    }

    if (mounted) {
      handleAuthChange('INITIAL_SESSION', session);
    }
  })
  .catch((error) => {
    clearTimeout(sessionTimeout);
    console.error('[AuthContext] Session fetch exception:', error);
    // Clear session on any error
    supabase.auth.signOut();
    clearUserProfileFromStorage();
    if (mounted) {
      setAuthState({ user: null, session: null, loading: false });
    }
  });
```

**Key Points:**
- Catches both Promise rejections and errors
- Clears invalid tokens with `supabase.auth.signOut()`
- Removes cached profile data
- Sets loading to false so UI can render

### 3. Added Error Handling in Auth Change Handler

Wrapped profile fetching with try-catch:

```typescript
const handleAuthChange = async (event: string, session: Session | null) => {
  if (!mounted) return;

  try {
    if (session?.user) {
      const profile = await fetchUserProfile(session.user.id, session);

      if (!profile) {
        console.warn('[AuthContext] No profile found for user, signing out');
        await supabase.auth.signOut();
        clearUserProfileFromStorage();
        if (mounted) {
          setAuthState({ user: null, session: null, loading: false });
        }
        return;
      }

      // ... set auth state
    }
  } catch (error) {
    console.error('[AuthContext] Error in handleAuthChange:', error);
    // On any error (including expired tokens), sign out and clear state
    await supabase.auth.signOut();
    clearUserProfileFromStorage();
    if (mounted) {
      setAuthState({ user: null, session: null, loading: false });
    }
  }
};
```

**Benefits:**
- Catches errors from profile fetch (database queries with expired tokens)
- Ensures loading state is always resolved
- Gracefully handles token expiration
- Users are redirected to auth page instead of hanging

### 4. Restored Session-Based Email Verification

Re-applied the session-based email verification check (from previous fix):

```typescript
// ✅ Check email verification from Supabase session (source of truth)
if (session?.user && !session.user.email_confirmed_at) {
  console.warn('[AuthContext] User email not verified in Supabase session');
  await supabase.auth.signOut();
  toastRef.current({
    title: "Email verification required",
    description: "Please verify your email before signing in",
    variant: "destructive",
  });
  return null;
}
```

## How It Works Now

### Scenario 1: User Returns After Token Expiration

1. App loads, `getSession()` is called
2. Supabase detects expired token
3. Either:
   - **Returns error** → Caught by error handler → Signs out → Shows auth page
   - **Takes too long** → Timeout fires → Clears state → Shows auth page
4. User sees auth page and can sign in again

### Scenario 2: Database Error with Expired Token

1. Session exists in localStorage but token is expired
2. `getSession()` succeeds but returns the stale session
3. `fetchUserProfile()` tries to query database
4. Database query fails (unauthorized/expired token)
5. Error is caught in try-catch
6. Signs out, clears state, shows auth page

### Scenario 3: Valid Token

1. App loads, `getSession()` is called
2. Token is valid, session is returned
3. Profile is fetched successfully
4. User is logged in, app loads normally

## Changes Made

### File: [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)

**1. Updated `fetchUserProfile` signature:**
```typescript
// Added session parameter for email verification check
const fetchUserProfile = async (userId: string, session?: Session | null): Promise<AuthUser | null>
```

**2. Added timeout and error handling to initial session fetch:**
```typescript
const sessionTimeout = setTimeout(() => { /* timeout logic */ }, 5000);

supabase.auth.getSession()
  .then(({ data: { session }, error }) => { /* handle success/error */ })
  .catch((error) => { /* handle exception */ });
```

**3. Added try-catch to `handleAuthChange`:**
```typescript
try {
  // Fetch profile
} catch (error) {
  // Sign out and clear state
}
```

**4. Added timeout cleanup in useEffect return:**
```typescript
return () => {
  clearTimeout(sessionTimeout);
  mounted = false;
  subscription.unsubscribe();
};
```

## Testing

### Test 1: Expired Token Simulation

**Manual Test (Quick):**
1. Sign in to the app
2. Open DevTools → Application → Local Storage
3. Find the Supabase auth token (key contains 'supabase.auth.token')
4. Modify the `expires_at` timestamp to a past time
5. Refresh the page
6. ✅ **Expected:** App should timeout within 5 seconds and show auth page

**Automatic Test (Real Scenario):**
1. Sign in to the app
2. Leave it open for 1+ hours (access token expiry)
3. Refresh the page or close and reopen
4. ✅ **Expected:** App should detect expired token and show auth page

### Test 2: Network Timeout

1. Sign in to the app
2. Open DevTools → Network tab
3. Set throttling to "Offline"
4. Refresh the page
5. ✅ **Expected:** Loading spinner for 5 seconds, then auth page

### Test 3: Normal Sign-in

1. Clear localStorage
2. Sign in with valid credentials
3. ✅ **Expected:** App loads normally, home page displays

### Test 4: Session Persistence

1. Sign in to the app
2. Close the browser completely
3. Reopen and navigate to the app
4. ✅ **Expected:**
   - If token still valid: Auto-logged in
   - If token expired: Shows auth page

## Configuration

### Token Expiration Times (Supabase)

Default Supabase token expiration:
- **Access Token**: 1 hour
- **Refresh Token**: 30 days

These can be changed in Supabase Dashboard → Authentication → Settings:
- `JWT_EXPIRY`: Access token lifetime
- `REFRESH_TOKEN_ROTATION_ENABLED`: Auto-refresh tokens

### Timeout Duration

The 5-second timeout can be adjusted in [AuthContext.tsx:219](src/contexts/AuthContext.tsx#L219):

```typescript
const sessionTimeout = setTimeout(() => {
  // ...
}, 5000); // Change this value (in milliseconds)
```

**Recommendations:**
- **3-5 seconds**: Good for most use cases
- **< 3 seconds**: Might timeout on slow connections
- **> 10 seconds**: Users might think app is broken

## Build Verification

```bash
npm run build:dev
```

Output:
```
✓ 3212 modules transformed.
✓ built in 11.19s
```

No TypeScript errors. Application ready for testing.

## Related Fixes

This fix builds on previous fixes:
- **Email Verification Fix** ([EMAIL_VERIFICATION_FIX.md](EMAIL_VERIFICATION_FIX.md)): Session-based email verification
- **Auth Timeout Fix** ([AUTH_TIMEOUT_FIX.md](AUTH_TIMEOUT_FIX.md)): Removed incorrect Promise.resolve wrappers
- **LocationProvider Fix**: Single provider instance to prevent race conditions

## Summary

**Problem:** Expired auth tokens caused infinite loading spinner.

**Solution:** Added timeout, error handling, and token cleanup to gracefully handle expired tokens.

**Result:** Users are redirected to auth page when tokens expire, rather than seeing infinite spinner.
