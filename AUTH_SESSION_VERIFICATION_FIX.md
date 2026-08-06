# Authentication trust and session fix

## Sign-up

After a successful sign-up with email confirmation enabled, the form is
replaced by a dedicated Verify Your Email screen. It includes:

- the email address used
- clear numbered instructions
- Continue to Sign In
- resend verification email
- support email

## Persistent session

The entire browser app now uses one Supabase client and one auth storage key.

The storage adapter:
- reads an existing session from localStorage or sessionStorage
- writes to the location selected by Remember Me
- removes stale copies from the other storage location
- is shared by the header, dashboard, AuthGuard, Checkout, and settings

This prevents the dashboard from recognizing a session while the header appears
logged out.
