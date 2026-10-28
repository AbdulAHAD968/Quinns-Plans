# Deploying Plans (public site) with Docker

## 1. Environment
Copy your existing `.env` to the VPS next to the `docker-compose.yml` (never commit it).
Point the database at your own MongoDB:

```
MONGODB_URL=mongodb://USER:PASSWORD@VPS_HOST:PORT/quen?authSource=admin&directConnection=true
```

Set `CLIENT_URL` / `ADMIN_URL` to the real public URLs (https), and keep `JWT_SECRET` / `COOKIE_SECRET` identical between the two apps.

## 2. Build and run
```
docker compose up -d --build
docker compose logs -f
```
The app listens on host port **3000** (container port 3000). Put a reverse proxy with HTTPS
(Caddy, nginx, Traefik, Coolify...) in front and point `plans.bodybyquinn.com` at it. Forward
`X-Forwarded-For` and `X-Forwarded-Proto`.

## 3. Update
```
git pull && docker compose up -d --build
```

## Notes
- Guide generation runs in the background after the Stripe webhook; it needs no function time limit on a VPS.
- Stripe webhook endpoint: `https://plans.bodybyquinn.com/api/webhooks/stripe`.
- Set `PLANS_INTERNAL_SECRET` (same value as the admin app) and `AMAZON_ASSOCIATE_TAG`.
