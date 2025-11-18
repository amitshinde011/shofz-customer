# Supabase Infinite Session Configuration Guide

## Overview

This application is configured for **infinite session lifetime** - users remain logged in until they manually sign out or their device is compromised. This provides an Amazon-like experience where users never need to re-authenticate.

## Current Configuration

### Supabase Dashboard Settings

Configure in: **Authentication → Sessions**  
Direct link: `https://supabase.com/dashboard/project/ikxmehpfxjycevztjrvc/auth/sessions`

**Required Settings:**
- ✅ **Time-box user sessions**: `0 hours` (sessions never expire)
- ✅ **Inactivity timeout**: `0` (no timeout)
- ✅ **Refresh token reuse interval**: `10 seconds` (security - prevents token replay attacks)

**CRITICAL SECURITY NOTE:** The refresh token reuse interval MUST be set to `10` seconds (default), NOT 1 year. This prevents stolen tokens from being reused for extended periods. This setting does NOT affect session lifetime.

### Access Token Settings

Access tokens expire every 1 hour for security (configured in Authentication → Settings → JWT Keys). This is independent of refresh token lifetime and does not affect user experience - tokens are automatically refreshed.

## How "Keep Session Active" Works

The "Keep session active" checkbox (formerly "Remember me") serves as a **session health maintenance** feature, NOT a session duration extender.

### Without "Keep Session Active" (Unchecked)
- **Session lifetime:** Infinite (relies on Supabase's automatic token refresh)
- **Behavior:** Users stay logged in indefinitely
- **Considerations:** If a user doesn't use the app for an extremely long period, they may need to sign in again due to edge cases in token refresh timing

### With "Keep Session Active" (Checked - Default)
- **Session lifetime:** Infinite (same as unchecked)
- **Additional benefit:** Proactive token refresh every 7 days
- **Behavior:** Keeps tokens actively fresh and prevents any potential staleness
- **Result:** Optimal session health for truly indefinite login

### Technical Implementation

**Proactive Token Refresh Cycle:**
```typescript
// Implemented in src/contexts/AuthContext.tsx
// When "Keep session active" is enabled:
- Sets localStorage flag: 'remember_me' = 'true'
- Refreshes session token every 7 days automatically
- Runs even when app is idle
- Prevents token staleness
```

**Session Health Monitoring:**
```typescript
// Implemented in src/lib/sessionValidator.ts and AuthContext
- Checks token validity every 2 minutes
- Detects expiration and forces sign-out with clear messaging
- Validates session on app load and window focus
- Prevents "zombie states" with blank screens
```

## Security Considerations

### Current Security Posture

**✅ Secure:**
1. Refresh token reuse interval: 10 seconds (prevents replay attacks)
2. Access token: 1 hour expiry (limits exposure window)
3. Session health monitoring: Active every 2 minutes
4. Automatic sign-out on genuine token issues
5. Pre-query session validation (prevents API calls with invalid tokens)

**⚠️ Trade-offs:**
- **Pro:** True "Amazon-like" lifetime logins, excellent user experience
- **Pro:** Users never forced to re-authenticate unless they sign out
- **Con:** If a user's refresh token is compromised, it could be used indefinitely
- **Mitigation:** Users can manually sign out from Profile page

### Future Enhancements
- Device management (view/revoke sessions from all devices)
- Suspicious activity detection
- Geographic/IP-based session validation

## Recent Production Fixes (2024)

### What We Fixed
- Removed aggressive sign-out logic that cleared sessions on temporary errors
- Increased session load timeout from 5s to 30s for slow networks
- Implemented retry logic with exponential backoff (3 attempts: 1s, 2s, 4s)
- Added offline detection to skip health checks when disconnected
- Reduced health monitoring from 2 minutes to 30 minutes
- Removed redundant "Remember Me" 7-day refresh (all sessions are now infinite by default)
- Fixed session clearing on profile fetch failures, role creation errors, and transient states
- Added autoRefreshToken failure handling

### Production-Ready Principles
1. **Trust Supabase's autoRefreshToken** - Let Supabase handle token refresh automatically
2. **Only sign out on explicit events** - SIGNED_OUT events or manual user action
3. **Keep sessions active during errors** - Temporary network/DB errors don't force sign-out
4. **User recovery first** - Let users recover from errors without re-authentication
5. **Battery efficient** - 30-minute health check intervals instead of aggressive polling
6. **Prioritize UX** - User experience over aggressive error handling

## User Experience

### Profile Page Features

Users can view and manage their session in the Profile page (`src/pages/Profile.tsx`):

- **Session Status Card:** Shows that session is active indefinitely
- **Manual Refresh Button:** Allows users to manually refresh their session
- **Sign Out Button:** Immediate session termination

### Authentication Flow

1. **Sign In:** User enters credentials and optionally checks "Keep session active"
2. **Session Creation:** Infinite lifetime refresh token is issued
3. **Active Maintenance:** If "Keep session active" is checked, tokens refresh every 7 days
4. **Sign Out:** Only when user explicitly clicks "Sign Out" button

## Testing

### Test Scenarios

**1. Standard Login (Keep session active unchecked):**
```bash
✓ Sign in
✓ Should stay logged in indefinitely
✓ Navigate away and return - still logged in
✓ Close browser and reopen - still logged in
✓ Wait days/weeks - still logged in (unless edge case)
```

**2. Active Session Maintenance (Keep session active checked - default):**
```bash
✓ Sign in with checkbox checked
✓ Tokens proactively refresh every 7 days
✓ Leave app idle for extended period - still logged in
✓ Close browser and reopen - still logged in
✓ Session remains healthy indefinitely
```

**3. Session Health Monitoring:**
```bash
✓ Leave app idle - session health checks pass
✓ Return after long period - no automatic sign-out
✓ If genuine token issue occurs - automatic sign-out with clear toast notification
```

**4. Manual Sign Out:**
```bash
✓ Click "Sign Out" in Profile page
✓ Immediately redirected to Auth page
✓ Session terminated
✓ All local storage cleared
```

## Migration Notes

### Moved from JWT Settings (Old Location)

**Previous Configuration (No longer applicable):**
- Refresh Token Lifetime was previously in Authentication → Settings
- That setting no longer exists in current Supabase versions

**New Configuration (Current):**
- Navigate to Authentication → Sessions
- Configure "Time-box user sessions" (requires Pro plan or higher)
- Default behavior (without Pro plan): Infinite sessions by default

### Upgrade Path

If you're on the Free plan:
- Sessions are infinite by default (no time-box setting available)
- "Keep session active" feature still works for proactive refresh
- Upgrade to Pro plan for granular session control options

## Dashboard Links

- **Sessions Configuration:** https://supabase.com/dashboard/project/ikxmehpfxjycevztjrvc/auth/sessions
- **JWT Settings:** https://supabase.com/dashboard/project/ikxmehpfxjycevztjrvc/auth/providers
- **Authentication Overview:** https://supabase.com/dashboard/project/ikxmehpfxjycevztjrvc/auth/users

## Summary

✅ **Sessions configured for infinite lifetime**  
✅ **"Keep session active" maintains optimal token health**  
✅ **Security maintained through proper reuse interval and monitoring**  
✅ **Users have full control via manual sign-out**  
✅ **Amazon-like user experience achieved**

This configuration provides the best balance between user convenience and security, ensuring users are never unexpectedly signed out while maintaining robust session health monitoring.
