# Nostic Ogl — Live deploy checklist (May 2026)

> **HTML version (with commands & live progress):** open [`DEPLOY_CHECKLIST.html`](DEPLOY_CHECKLIST.html) in your browser.  
> Updated after each deploy action.

Track progress here. Use **Railway + Vercel default URLs** first; add custom domain + Cloudflare when ready.

---

## Pre-flight (local)

- [x] Backend builds (`npm run build` in `backend/`)
- [x] Frontend builds (`npm run build` in `frontend/`)
- [ ] **Push latest code to GitHub** (`sailandsaga29/nostic-ogl`) — Railway/Vercel deploy from repo

---

## Step 1 — Supabase (database)

1. Go to [supabase.com](https://supabase.com) → Sign up / log in → **New project**
2. Name: `nostic-ogl` · Region: **South Asia (Mumbai)** if available · **Free** plan
3. Save the **database password** (shown once)
4. Wait until project status is **Active**
5. **Project Settings → Database → Connection string → URI**
   - Choose **Transaction pooler** (port **6543**), mode **Session** or **Transaction**
   - Copy string; replace `[YOUR-PASSWORD]` with your DB password
6. Save as `DATABASE_URL` (you will paste this into Railway in Step 2)

**Your DATABASE_URL:** `_______________________________________________`

---

## Step 2 — Railway (backend)

1. [railway.app](https://railway.app) → Sign up with **GitHub**
2. **New Project → Deploy from GitHub repo** → select `nostic-ogl`
3. Click the service → **Settings → Root Directory** → set to **`backend`**
4. **Variables** tab — add all of these:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | *(paste from Step 1)* |
| `DB_SSL` | `true` |
| `DB_SYNCHRONIZE` | `true` *(first deploy only — change to `false` after Step 5)* |
| `JWT_SECRET` | *(see secrets below — generate new if lost)* |
| `JWT_REFRESH_SECRET` | *(see secrets below)* |
| `JWT_EXPIRATION` | `15m` |
| `JWT_REFRESH_EXPIRATION` | `7d` |
| `FRONTEND_URL` | *(Vercel URL from Step 3, e.g. `https://nostic-ogl.vercel.app`)* |
| `PHONEPE_MOCK_MODE` | `true` |

5. **Settings → Networking → Generate domain** → copy URL (e.g. `https://nostic-ogl-production.up.railway.app`)
6. Wait for deploy green; open **`https://YOUR-RAILWAY-URL/api/docs`**

**Railway API URL:** `_______________________________________________`

---

## Step 3 — Vercel (frontend)

1. [vercel.com](https://vercel.com) → Sign up with **GitHub**
2. **Add New → Project** → import `nostic-ogl`
3. **Root Directory** → **`frontend`**
4. Framework: **Vite** (auto-detected) · Build: `npm run build` · Output: **`dist`**
5. **Environment Variables** (Production):

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | `https://YOUR-RAILWAY-URL/api` *(no trailing slash)* |

6. Deploy → copy site URL (e.g. `https://nostic-ogl.vercel.app`)
7. Go back to **Railway → Variables** → set/update `FRONTEND_URL` to your Vercel URL → redeploy backend

**Vercel site URL:** `_______________________________________________`

---

## Step 4 — Cloudflare (optional until you have a domain)

Skip for now if you don't have a domain. Use Vercel + Railway URLs above.

When ready:

| Type | Name | Target |
|------|------|--------|
| CNAME | `@` | Vercel (`cname.vercel-dns.com`) |
| CNAME | `www` | Vercel |
| CNAME | `api` | Railway hostname |

Then update `FRONTEND_URL`, `VITE_API_URL`, and Vercel/Railway custom domains.

- [ ] Domain added to Cloudflare
- [ ] DNS records set
- [ ] SSL: Full (strict) + Always HTTPS

---

## Step 5 — Seed production database (once)

After first Railway deploy succeeded with `DB_SYNCHRONIZE=true`:

**Option A — from your PC** (recommended):

```bash
cd backend
# Paste your Supabase DATABASE_URL (same as Railway)
export DATABASE_URL="postgresql://..."
export DB_SSL=true
npm run seed
```

**Option B — Railway shell:** Service → **Shell** → `npm run seed`

Then on Railway set **`DB_SYNCHRONIZE=false`** and redeploy.

**Default logins after seed:**

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@nosticogl.com` | `Admin@123` |
| Manager | `manager@nosticogl.com` | `Manager@123` |
| Staff | `staff@nosticogl.com` | `Staff@123` |

Change passwords after first login in production.

- [ ] Seed completed
- [ ] `DB_SYNCHRONIZE=false` on Railway
- [ ] Backend redeployed

---

## Step 6 — Go-live verification

- [ ] Vercel URL loads login page
- [ ] `https://YOUR-RAILWAY-URL/api/docs` opens Swagger
- [ ] Admin login works
- [ ] Staff POS loads flavors
- [ ] Mock PhonePe payment flow works
- [ ] Calendar: review usage **1 June 2026**

---

## JWT secrets (generate once; store in password manager)

Run locally if you need new ones:

```bash
openssl rand -base64 64
openssl rand -base64 64
```

Use output for `JWT_SECRET` and `JWT_REFRESH_SECRET` on Railway only — **never commit to git**.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error on login | `FRONTEND_URL` on Railway must exactly match Vercel URL (https, no trailing slash) |
| DB connection failed | Use Supabase **pooler** URL (port 6543), `DB_SSL=true` |
| 502 on Railway | Check deploy logs; confirm `PORT=3000` |
| Empty flavors | Run seed (Step 5) |
| Tables missing | Temporarily set `DB_SYNCHRONIZE=true`, redeploy, then seed, then `false` |
