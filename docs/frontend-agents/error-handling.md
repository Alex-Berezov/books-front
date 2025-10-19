## Error handling and HTTP → UI mapping

Common statuses:

- 400 Validation error: show inline form errors; payload usually includes message and details
- 401 Unauthorized: redirect to sign-in (NextAuth signIn()) or show login CTA
- 403 Forbidden: show "Not enough permissions" (for staff-only areas)
- 404 Not found: use Next.js notFound() on public pages; show empty state on lists
- 409 Conflict: surface as toast; often duplicate slug/email
- 429 Too Many Requests: rate limit reached (comments/uploads); show friendly cooldown message
- 500 Server error: generic error page; allow retry

Retry/caching:

- Use React Query retries for idempotent GETs; avoid retry on 4xx
- Cache by keys including lang for language-aware resources

Auth token expiry:

- If backend returns 401 and token is expired, attempt refresh via /auth/refresh then replay the request once; otherwise sign out
