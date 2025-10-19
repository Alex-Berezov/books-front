## Auth integration (Auth.js aka NextAuth)

> **Production API:** `https://api.bibliaris.com/api`

Backend endpoints (neutral, no /:lang):

- `POST /api/auth/register` → `{ email, password }` ⇒ `{ accessToken, refreshToken, user }`
- `POST /api/auth/login` → `{ email, password }` ⇒ `{ accessToken, refreshToken, user }`
- `POST /api/auth/refresh` → `{ refreshToken }` ⇒ `{ accessToken, refreshToken }`
- `POST /api/auth/logout` → stateless, optional in FE

Token model:

- **accessToken** (JWT) for `Authorization: Bearer <token>`
  - **Expires:** 12 hours (`JWT_ACCESS_EXPIRES_IN=12h`)
  - **Usage:** All authenticated API requests
- **refreshToken** (JWT) for rotating tokens via `/auth/refresh`
  - **Expires:** 7 days (`JWT_REFRESH_EXPIRES_IN=7d`)
  - **Usage:** Get new accessToken when expired

### Rate Limits (Important!)

- **Login:** 5 requests/minute per IP
- **Register:** 3 requests/5 minutes per IP
- **Refresh:** 10 requests/minute per IP

Handle 429 errors gracefully in your UI!

Recommended NextAuth setup:

- Credentials provider for login (email+password) calling POST /auth/login
- Optional “register” action: call /auth/register then treat response like login
- Session strategy: jwt; store accessToken and refreshToken in NextAuth JWT
- Automatic refresh: implement NextAuth jwt callback that calls /auth/refresh if accessToken is expired/near expiry

Sketch (callbacks only; adapt to your FE):

- jwt(token, user): on login, persist accessToken/refreshToken from backend response; on subsequent calls, if expired, call /auth/refresh
- session(session, token): expose accessToken to client; attach roles if you also fetch /users/me

Headers:

- For language‑aware user flows (post‑login redirect), pass Accept-Language from current UI locale; keep redirect target on FE

Roles:

- Staff roles (admin|content_manager) are computed on backend by email + DB; FE can check by calling GET /api/users/me and reading roles[]

Logout:

- Just clear NextAuth session; backend logout is stateless and optional
