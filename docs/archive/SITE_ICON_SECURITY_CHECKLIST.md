# Browser Icon and Security Checklist

## Added
- Strafe Crate browser-tab icon
- Apple touch icon
- Web app manifest
- Open Graph and social-sharing metadata
- Production metadata base for https://strafecrate.com

## If the browser says "Not secure"
Check Vercel > Project > Settings > Domains:
- strafecrate.com is assigned to this production project
- DNS is valid
- SSL certificate is active
- https://strafecrate.com loads without a certificate warning

## If Chrome says "Deceptive site ahead" or "Dangerous site"
Verify the domain in Google Search Console, open Security & Manual Actions >
Security issues, resolve the reported URLs, and request a review.

## If the warning appears during login or an email link
In Supabase > Authentication > URL Configuration:
- Site URL: https://strafecrate.com
- Redirect URL: https://strafecrate.com/**
- Add https://www.strafecrate.com/** only if that hostname is configured
- Avoid production auth links that return users to temporary *.vercel.app URLs
