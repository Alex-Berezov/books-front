# Frontend Deployment Guide

> **Backend:** `https://api.bibliaris.com` ✅ Ready  
> **Frontend Target:** `https://bibliaris.com` (TBD)

---

## Prerequisites

### ✅ Backend is Ready

- API endpoint: `https://api.bibliaris.com/api`
- SSL certificates: Automatic (Let's Encrypt)
- CORS configured for: `https://bibliaris.com`
- Health checks: Passing
- Rate limiting: Active

### Environment Variables Required

```env
# Production
NEXT_PUBLIC_API_BASE_URL=https://api.bibliaris.com/api
NEXTAUTH_URL=https://bibliaris.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Optional: Analytics, Monitoring
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
# SENTRY_DSN=https://...
```

---

## Deployment Options

### Option 1: Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod

# 4. Configure environment variables in Vercel dashboard
# https://vercel.com/<your-org>/settings/environment-variables
```

**Vercel Configuration:**

```json
{
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "rewrites": []
}
```

### Option 2: Docker + Same Server (Caddy)

**Directory Structure:**

```
/opt/books/
├── app/          # Backend (existing)
└── frontend/     # Frontend (new)
```

**Steps:**

1. **Build Frontend Docker Image**

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["yarn", "start"]
```

2. **Docker Compose** (`/opt/books/frontend/docker-compose.yml`)

```yaml
version: '3.9'

services:
  frontend:
    build: .
    container_name: bibliaris-frontend
    restart: unless-stopped
    ports:
      - '127.0.0.1:3000:3000'
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_BASE_URL=https://api.bibliaris.com/api
      - NEXTAUTH_URL=https://bibliaris.com
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    healthcheck:
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:3000']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

3. **Update Caddy Configuration**

Add to `/etc/caddy/Caddyfile`:

```caddyfile
# Frontend
bibliaris.com {
    reverse_proxy localhost:3000

    # Security headers
    header {
        -Server
        X-Content-Type-Options nosniff
        X-Frame-Options SAMEORIGIN
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    }

    # Cache static assets
    @static {
        path /_next/static/*
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

    @images {
        path *.jpg *.jpeg *.png *.gif *.ico *.svg *.webp
    }
    header @images Cache-Control "public, max-age=86400"
}

# Remove temporary redirect (currently: bibliaris.com → api.bibliaris.com/docs)
```

4. **Deploy**

```bash
# On server
cd /opt/books/frontend
docker compose up -d --build

# Reload Caddy
sudo systemctl reload caddy

# Check logs
docker compose logs -f frontend
```

### Option 3: Netlify

```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Login
netlify login

# 3. Deploy
netlify deploy --prod

# 4. Configure environment variables in Netlify dashboard
```

**Netlify Configuration (`netlify.toml`):**

```toml
[build]
  command = "yarn build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---

## SSL Configuration

### Caddy (Automatic)

- Caddy automatically requests Let's Encrypt certificates
- No manual configuration needed
- Certificates auto-renew

### Vercel/Netlify

- SSL included automatically
- No configuration needed

---

## Domain Configuration

### DNS Records (Namecheap)

```
Type: A Record
Host: @
Value: 209.74.88.183
TTL: Automatic

Type: A Record
Host: www
Value: 209.74.88.183
TTL: Automatic
```

**Already Configured:**

```
Type: A Record
Host: api
Value: 209.74.88.183
TTL: Automatic
✅ Active
```

### Verify DNS

```bash
dig bibliaris.com +short
# Should return: 209.74.88.183

dig www.bibliaris.com +short
# Should return: 209.74.88.183
```

---

## Health Checks

### Frontend Health Check

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
```

### Monitor Both Services

```bash
# Backend
curl https://api.bibliaris.com/api/health/liveness

# Frontend
curl https://bibliaris.com/api/health

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://bibliaris.com
```

---

## Rollback Strategy

### Vercel

- Instant rollback via dashboard
- Previous deployments always available

### Docker

```bash
# On server
cd /opt/books/frontend

# Stop current
docker compose down

# Restore previous image
docker tag bibliaris-frontend:previous bibliaris-frontend:latest

# Start
docker compose up -d
```

---

## Monitoring & Logging

### Application Logs

```bash
# Docker deployment
docker compose -f /opt/books/frontend/docker-compose.yml logs -f --tail=100

# Check errors
docker compose logs frontend | grep -i error
```

### Caddy Logs

```bash
# Access logs (if logging enabled)
sudo journalctl -u caddy -f

# Check for errors
sudo journalctl -u caddy | grep -i error
```

### Performance Monitoring

Consider adding:

- **Vercel Analytics** (built-in)
- **Google Analytics 4**
- **Sentry** (error tracking)
- **LogRocket** (session replay)

---

## Security Checklist

- [ ] Environment variables secured (not in git)
- [ ] NEXTAUTH_SECRET generated securely
- [ ] CSP headers configured
- [ ] Rate limiting on API routes
- [ ] HTTPS enforced
- [ ] Security headers set (via Caddy or Next.js)
- [ ] Dependencies updated
- [ ] Secrets rotation schedule

---

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Build
        run: yarn build
        env:
          NEXT_PUBLIC_API_BASE_URL: ${{ secrets.NEXT_PUBLIC_API_BASE_URL }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Testing Deployment

### Smoke Tests

```bash
# Homepage
curl -I https://bibliaris.com

# API integration
curl https://bibliaris.com/api/health

# Static assets
curl -I https://bibliaris.com/_next/static/...

# Test from different locations
# Use: https://www.websiteplanet.com/webtools/load-time/
```

### Browser Testing

1. Open https://bibliaris.com
2. Check console for errors
3. Test auth flow (login/logout)
4. Verify API calls in Network tab
5. Test on mobile devices
6. Check page load times

---

## Troubleshooting

### Frontend Won't Start

```bash
# Check logs
docker compose logs frontend

# Common issues:
# 1. Port 3000 already in use
# 2. Missing environment variables
# 3. Build errors
```

### CORS Errors

```bash
# Verify backend CORS configuration
curl -H "Origin: https://bibliaris.com" \
     -I https://api.bibliaris.com/api/health/liveness

# Should see:
# access-control-allow-origin: https://bibliaris.com
# access-control-allow-credentials: true
```

### SSL Certificate Issues

```bash
# Check Caddy status
sudo systemctl status caddy

# Check certificates
sudo caddy list-certificates

# Force certificate renewal
sudo systemctl restart caddy
```

---

## Next Steps After Deployment

1. **Update Backend Caddyfile:**
   - Remove temporary redirect: `bibliaris.com → api.bibliaris.com/docs`
   - Keep frontend config: `bibliaris.com → localhost:3000`

2. **Monitor for 24h:**
   - Check error rates
   - Monitor performance
   - Review logs

3. **Setup Monitoring:**
   - Uptime monitoring (UptimeRobot, Pingdom)
   - Error tracking (Sentry)
   - Analytics (Google Analytics, Vercel Analytics)

4. **Create Backups:**
   - Database backups (already configured for backend)
   - Frontend build artifacts
   - Environment variables backup

---

## Support

- **Backend Issues:** Check `docs/TROUBLESHOOTING.md` in backend repo
- **Frontend Issues:** Check Next.js docs
- **Server Issues:** `ssh deploy@209.74.88.183` and check logs
- **Emergency Rollback:** Use deployment scripts or provider dashboard

---

**Backend Repository:** https://github.com/Alex-Berezov/books  
**Documentation:** `/docs` folder  
**Backend Health:** https://api.bibliaris.com/api/health/readiness
