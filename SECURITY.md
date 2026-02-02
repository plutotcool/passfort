# Security

## Reporting a vulnerability

If you believe you have found a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue for security-sensitive bugs.
2. Open a [GitHub private security advisory](https://github.com/tommyv1987/passfort/security/advisories/new) for this repository, or email the maintainer if you have a contact.
3. Include a clear description, steps to reproduce, and impact if possible.
4. We will acknowledge receipt and aim to respond within a reasonable time. We may ask for more detail and will work with you on a fix and disclosure timeline.

## Security considerations

### Password storage

- **Production:** Use a hashed password (`PASSFORT_HASH`) instead of plain text. Generate with `npx passfort hash "your-password"`.
- **Development / preview:** Plain `PASSFORT_PASSWORD` is acceptable for quick start; switch to hash for any deployment that could be exposed.

### Session cookies

- Sessions are stored in an **HttpOnly**, **SameSite=Lax** cookie, signed with HMAC-SHA256 using your secret.
- The cookie is set **Secure** on HTTPS. On `http://localhost` it is set without Secure so local development works.
- Keep `PASSFORT_SECRET` long and random (e.g. `openssl rand -base64 24`). Do not commit it.

### Rate limiting

- Built-in rate limiting limits password attempts per client IP (configurable via `PASSFORT_RATE_LIMIT_MAX` and `PASSFORT_RATE_LIMIT_WINDOW_MS`). When exceeded, the server returns **429 Too Many Requests** with `Retry-After`.
- The client IP is taken from `X-Forwarded-For` (first hop) or `X-Real-IP`. If your deployment does not set these from a trusted proxy, a client can spoof them; rate limits are then best-effort. Use a platform that sets a trusted client IP (e.g. Vercel, Cloudflare) or a global limit (e.g. Vercel Firewall, Upstash).
- In Vercel Edge Runtime, each isolate has its own in-memory state, so this is **best-effort per instance**, not a global limit. For strict global rate limiting (e.g. high-value deployments), use [Vercel Firewall](https://vercel.com/docs/security/vercel-firewall) or an external store (e.g. Upstash Redis) and consider adding your own middleware or proxy.

### HTTPS

- Use HTTPS in production. Session cookies should only be sent over HTTPS (handled automatically when the request is `https:`).

### Open redirect

- The `return_url` parameter is validated to same-origin paths only; protocol-relative or off-site redirects are rejected.

### Dependencies

- Keep dependencies up to date. Run `pnpm audit` and address reported vulnerabilities.
