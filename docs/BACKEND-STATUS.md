# Backend API Status

> **Last Checked:** October 25, 2025  
> **Status:** ✅ All Systems Operational

---

## 🚀 Quick Links

| Resource | URL | Status |
|----------|-----|--------|
| **API Base** | `https://api.bibliaris.com/api` | ✅ Online |
| **Swagger UI** | `https://api.bibliaris.com/docs` | ✅ Available |
| **OpenAPI Schema** | `https://api.bibliaris.com/docs-json` | ✅ Available |
| **Health Check** | `https://api.bibliaris.com/api/health/liveness` | ✅ Up |
| **Readiness Check** | `https://api.bibliaris.com/api/health/readiness` | ✅ Ready |
| **Metrics** | `https://api.bibliaris.com/metrics` | ✅ Available |

---

## 📊 System Health (Latest Check)

```json
{
  "status": "up",
  "uptime": 421.53,
  "timestamp": "2025-10-25T10:39:07.142Z"
}
```

### Infrastructure Status:
- ✅ **PostgreSQL Database:** Connected and responding
- ✅ **Redis Cache:** Operational
- ✅ **HTTPS/SSL:** Let's Encrypt certificates valid
- ✅ **CORS:** Configured for frontend domains
- ✅ **Rate Limiting:** Active and configurable

---

## 🔐 Authentication

### Test Credentials
For development/testing purposes, you can create test users via:
```http
POST https://api.bibliaris.com/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePassword123!",
  "displayName": "Test User"
}
```

### Getting Access Token
```http
POST https://api.bibliaris.com/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePassword123!"
}
```

Response includes:
- `accessToken` - Valid for 12 hours
- `refreshToken` - Valid for 7 days

---

## 📋 Available Endpoint Groups

### Public Endpoints (No Auth Required)
- ✅ **Books Overview:** `GET /:lang/books/:slug/overview`
- ✅ **Pages:** `GET /:lang/pages/:slug`
- ✅ **Categories:** `GET /:lang/categories/:slug/books`
- ✅ **Tags:** `GET /:lang/tags/:slug/books`
- ✅ **SEO Resolution:** `GET /:lang/seo/resolve`

### Auth Endpoints
- ✅ **Register:** `POST /auth/register`
- ✅ **Login:** `POST /auth/login`
- ✅ **Refresh Token:** `POST /auth/refresh`
- ✅ **Logout:** `POST /auth/logout`
- ✅ **Get Current User:** `GET /users/me`

### Admin Endpoints (Require Auth + Admin/Content Manager Role)
- ✅ **Books CRUD:** `/api/books/*`
- ✅ **Book Versions:** `/api/books/{id}/versions/*`
- ✅ **Chapters:** `/api/versions/{id}/chapters/*`
- ✅ **Audio Chapters:** `/api/versions/{id}/audio-chapters/*`
- ✅ **Categories:** `/api/categories/*`
- ✅ **Tags:** `/api/tags/*`
- ✅ **Pages (CMS):** `/api/admin/{lang}/pages/*`
- ✅ **Media Upload:** `/api/media/*`
- ✅ **Users Management:** `/api/users/*`
- ✅ **SEO Management:** `/api/versions/{id}/seo`

### User Endpoints (Require Auth)
- ✅ **Bookshelf:** `/api/me/bookshelf/*`
- ✅ **Reading Progress:** `/api/me/progress/*`
- ✅ **Comments:** `/api/comments/*`
- ✅ **Likes:** `/api/likes/*`

---

## 🧪 Testing with Swagger UI

### Step-by-Step Guide:

1. **Open Swagger UI:**
   - Navigate to: https://api.bibliaris.com/docs

2. **Create/Login Account:**
   - Use `POST /auth/register` or `POST /auth/login`
   - Copy the `accessToken` from response

3. **Authorize:**
   - Click "Authorize" button (lock icon, top right)
   - Enter: `Bearer {paste-your-token-here}`
   - Click "Authorize" and close modal

4. **Test Endpoints:**
   - All protected endpoints now work
   - Try creating a book, adding versions, categories, etc.
   - See real-time request/response data

---

## 📝 Quick Test Scenarios

### Scenario 1: Create a Complete Book

```bash
# 1. Login
curl -X POST https://api.bibliaris.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
# Save accessToken from response

# 2. Create Book
curl -X POST https://api.bibliaris.com/api/books \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"slug":"test-book"}'
# Save book id from response

# 3. Create Version
curl -X POST https://api.bibliaris.com/api/books/{bookId}/versions \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "language":"en",
    "title":"Test Book",
    "author":"Test Author",
    "description":"Test description",
    "coverImageUrl":"https://example.com/cover.jpg",
    "type":"text",
    "isFree":true
  }'
# Save version id from response

# 4. Publish Version
curl -X PATCH https://api.bibliaris.com/api/versions/{versionId}/publish \
  -H "Authorization: Bearer {token}"
```

### Scenario 2: List All Books

```bash
curl -X GET https://api.bibliaris.com/api/books?page=1&limit=10 \
  -H "Authorization: Bearer {token}"
```

### Scenario 3: Get Book Overview (Public)

```bash
curl -X GET https://api.bibliaris.com/api/en/books/test-book/overview \
  -H "Accept-Language: en-US,en;q=0.9"
```

---

## 🐛 Troubleshooting

### Common Issues:

| Issue | Solution |
|-------|----------|
| **401 Unauthorized** | Token expired - login again to get new token |
| **403 Forbidden** | User doesn't have required role (admin/content_manager) |
| **404 Not Found** | Check endpoint path and method |
| **429 Too Many Requests** | Rate limit exceeded - wait and retry |
| **CORS Error** | Contact backend team to whitelist your domain |

### Health Check Commands:

```bash
# Check if API is alive
curl https://api.bibliaris.com/api/health/liveness

# Check if services are ready
curl https://api.bibliaris.com/api/health/readiness

# Check rate limit config
curl https://api.bibliaris.com/api/status/rate-limit \
  -H "Authorization: Bearer {token}"
```

---

## 📖 Documentation References

- **Detailed API Reference:** [./frontend-agents/backend-api-reference.md](./frontend-agents/backend-api-reference.md)
- **API Cheatsheet:** [./frontend-agents/api-cheatsheet.md](./frontend-agents/api-cheatsheet.md)
- **Swagger UI:** https://api.bibliaris.com/docs
- **OpenAPI Schema:** https://api.bibliaris.com/docs-json

---

## ✅ Verification Checklist

Use this checklist before starting frontend development:

- [ ] Can access Swagger UI: https://api.bibliaris.com/docs
- [ ] Can login and get access token
- [ ] Can create a test book via API
- [ ] Can create a book version
- [ ] Can publish/unpublish version
- [ ] Can create categories and tags
- [ ] Can attach categories/tags to version
- [ ] Health check returns "up" status

---

## 📞 Support

If you encounter issues with the backend:

1. Check this status page first
2. Verify health endpoints
3. Check Swagger UI for detailed error messages
4. Review backend logs if you have access
5. Contact backend team with specific error details

---

**Last Verification:** October 25, 2025, 10:39 UTC  
**Next Scheduled Check:** As needed during development
