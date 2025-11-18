# Supabase Token Configuration Guide

## Configure 90-Day Refresh Tokens (Default)

To set the default refresh token lifetime to 90 days for all users:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Settings**
3. Scroll down to **Auth Providers** section
4. Find **Refresh Token Lifetime** setting
5. Change the value from `2592000` (30 days) to `7776000` (90 days)
6. Click **Save**

**Calculation:**
- 30 days = 2,592,000 seconds (default)
- 90 days = 7,776,000 seconds (recommended)
- Formula: `days × 24 hours × 60 minutes × 60 seconds`

## How "Remember Me" Works (180 Days)

The "Remember Me" checkbox extends sessions to approximately 180 days through:

1. **User checks "Remember Me"** → Preference stored in localStorage
2. **Base token lifetime** → 90 days (configured in Supabase Dashboard)
3. **Proactive refresh** → Tokens automatically refresh every 7 days when Remember Me is enabled
4. **Effective lifetime** → As long as user opens the app within 7 days, session persists up to ~180 days

### Technical Implementation

- When checked: Implements 7-day proactive token refresh cycle
- When unchecked: Standard 90-day token lifetime without extension
- Preference cleared on sign-out

## Security Notes

- Users without "Remember Me" will be signed out after 90 days
- Users with "Remember Me" stay signed in as long as they use the app within 7-day intervals
- All sessions are protected by the token expiration fix (no "zombie states")
- Users can manually sign out at any time to end their session

## Dashboard Link

Configure tokens here:
https://supabase.com/dashboard/project/ikxmehpfxjycevztjrvc/auth/providers

## Testing

To verify the configuration:

1. Sign in **without** "Remember Me" → Session expires after 90 days
2. Sign in **with** "Remember Me" → Session persists through proactive 7-day refreshes
3. Check Profile page → Session Status card shows expiration time
4. Manual refresh → Users can manually extend session via Profile page
