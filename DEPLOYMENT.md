# Nostic Ogl — Production Deployment & Quotation

**Strategy:** Start free in May 2026 → upgrade gradually for long-run (~₹6,000/mo when on Pro tiers).

---

## Current month — May 2026 (Phase 1: ₹0 hosting)

| Service | Plan (now) | Cost | This month — action |
|---------|------------|------|---------------------|
| **Cloudflare** | Free | ₹0 | Point domain DNS; SSL Full (strict) |
| **Vercel** | Hobby | ₹0 | Deploy `frontend/`; set `VITE_API_URL` |
| **Railway** | Free ($5 credit/mo) | ₹0* | Deploy `backend/`; custom domain optional |
| **Supabase** | Free (500 MB) | ₹0 | Create project; pooler `DATABASE_URL`; seed once |
| **GitHub** | Free | ₹0 | `sailandsaga29/nostic-ogl` |
| **PhonePe** | Mock mode | ₹0 | `PHONEPE_MOCK_MODE=true` until live |

**Estimated hosting this month: ₹0**

\*Railway $5 monthly credit — enough for launch/testing; monitor dashboard.

### May 2026 checklist

- [ ] Create Supabase + Railway + Vercel accounts
- [ ] Deploy backend then frontend from GitHub
- [ ] Generate JWT secrets (`openssl rand -base64 64`)
- [ ] Configure Cloudflare DNS (`@`, `www`, `api`)
- [ ] Run `npm run seed` once on production DB
- [ ] Test admin login, staff POS, mock PhonePe
- [ ] Review usage on **1 June 2026**

### Upgrade path

| Phase | When | Approx. cost |
|-------|------|--------------|
| **May 2026 — now** | Launch & test on free tiers | **₹0/mo** |
| **Daily POS** | Railway credit exhausted or API must stay up | +₹850–1,700/mo |
| **DB growth** | Supabase > ~400 MB or project pauses | Supabase Pro +₹2,100/mo |
| **Long-run** | Forever data + commercial use | **~₹5,600–6,700/mo** |

---

## Architecture

### Phase 1 — May 2026 (free)

| Layer | Service | Plan |
|-------|---------|------|
| DNS + SSL | **Cloudflare** | Free |
| Frontend | **Vercel** | Hobby |
| Backend API | **Railway** | Free ($5 credit) |
| Database | **Supabase** | Free (500 MB) |
| Code | **GitHub** | Free |

### Long-run target (renew when ready)

| Layer | Service | Plan |
|-------|---------|------|
| DNS + SSL | **Cloudflare** | Free |
| Frontend | **Vercel** | Pro |
| Backend API | **Railway** | Pro / usage |
| Database | **Supabase** | Pro (8 GB+, backups) |
| Code | **GitHub** | Free |

```
User → Cloudflare DNS → Vercel (React)
                      → Railway (NestJS /api)
                              → Supabase Postgres
```

---

## Security implemented in codebase

| Control | Status |
|---------|--------|
| JWT 15m + refresh 7d with **rotation** | ✅ |
| Refresh token stored hashed, **revoked on logout** | ✅ |
| Account **lockout** after 5 failed logins (15 min) | ✅ |
| **Rate limiting** 10 req/min global; login 5; register 3 | ✅ |
| **bcrypt** 12 rounds | ✅ |
| **Helmet** security headers | ✅ |
| **ValidationPipe** strict | ✅ |
| CORS → `FRONTEND_URL` only | ✅ |
| **30 min inactivity logout** (frontend) | ✅ |
| Auto **token refresh** on 401 | ✅ |
| `DB_SYNCHRONIZE=false` in production | ✅ (via env) |
| HTTPS | ✅ (Vercel + Railway + Cloudflare) |

---

## Deployment steps (checklist)

### 1. Supabase (database) — start free
1. Create project at [supabase.com](https://supabase.com) → **Free plan** (upgrade to Pro later)
2. Settings → Database → copy **Connection string (URI, pooler)**
3. Set `DATABASE_URL` on Railway
4. First deploy: set `DB_SYNCHRONIZE=true` once, run app, then set `false`
5. Run seed once: `npm run seed` (Railway shell or local against prod URL)

### 2. Railway (backend)
1. [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Root directory: **`backend`**
3. Variables (from `backend/.env.example`):
   - `DATABASE_URL`, `DB_SSL=true`, `DB_SYNCHRONIZE=false`
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` → `openssl rand -base64 64`
   - `FRONTEND_URL=https://yourdomain.com`
   - PhonePe production vars
4. Settings → Networking → Custom domain: **`api.yourdomain.com`**

### 3. Vercel (frontend)
1. [vercel.com](https://vercel.com) → Import GitHub repo
2. Root directory: **`frontend`**
3. Build: `npm run build` | Output: **`dist`**
4. Env: `VITE_API_URL=https://api.yourdomain.com/api`
5. Domains → add **`yourdomain.com`**

### 4. Cloudflare (DNS)
| Type | Name | Target |
|------|------|--------|
| CNAME | `@` | Vercel (cname.vercel-dns.com) |
| CNAME | `www` | Vercel |
| CNAME | `api` | Railway provided hostname |

Enable: SSL **Full (strict)**, **Always HTTPS**, basic WAF (free).

### 5. Go-live verification
- [ ] `https://yourdomain.com` loads login
- [ ] `https://api.yourdomain.com/api/docs` opens Swagger
- [ ] Admin login works
- [ ] Staff POS + order flow
- [ ] PhonePe callback URL reachable (test mode off when ready)

---

## Cost quotation

### Current month — May 2026 (active plan)

| Service | Plan | INR/month |
|---------|------|-----------|
| Cloudflare | Free | **₹0** |
| Vercel | Hobby | **₹0** |
| Railway | Free ($5 credit) | **₹0** |
| Supabase | Free (500 MB) | **₹0** |
| **Total hosting** | | **₹0** |

### Long-run quotation (upgrade when ready)

*Rates approximate; USD ₹85–88. For forever data + always-on POS.*

### Recommended production stack

| Service | Plan | USD/mo | INR/mo (≈) | Purpose |
|---------|------|--------|------------|---------|
| **Supabase** | Pro | $25 | **₹2,100** | 8 GB DB, backups, no pause, forever data |
| **Railway** | Pro / usage | $20–25 | **₹1,700–2,200** | Always-on API, no sleep, PhonePe webhooks |
| **Vercel** | Pro | $20 | **₹1,700** | Production frontend, team SLA, analytics |
| **Cloudflare** | Free | $0 | **₹0** | DNS, SSL, CDN, basic DDoS |
| **Domain** | — | — | **₹100/mo** | ~₹1,200/year amortized |
| **Cursor Pro** (dev) | Optional | $20 | **₹1,700** | Build/maintain (not hosting) |

### Monthly total

| Tier | Stack | INR/month |
|------|-------|-----------|
| **Minimum reliable** | Supabase Pro + Railway ~$15 + Vercel Hobby* | **~₹3,500–4,000** |
| **Recommended (your spec)** | Supabase Pro + Railway Pro + Vercel Pro + CF Free | **~₹5,600–6,700** |
| **With Cursor Pro** | Above + Cursor | **~₹7,300–8,400** |

\*Vercel Hobby is free but Pro recommended for commercial franchise use (SLA, support, no hobby limits).

### Annual budget (recommended)

| Item | INR/year |
|------|----------|
| Hosting (Supabase + Railway + Vercel Pro) | **₹68,000 – 80,000** |
| Domain renewal | **₹1,000 – 1,500** |
| **Total production** | **~₹70,000 – 82,000/year** (~₹5,800–6,800/mo) |

### Year 1 one-time / optional

| Item | INR |
|------|-----|
| PhonePe merchant setup | As per PhonePe (varies) |
| SSL | ₹0 (included) |
| Migration / seed / launch support | DIY with this guide |

---

## Free tier limits — know when to upgrade

| Signal | Action |
|--------|--------|
| Supabase DB > 400 MB or project pauses | Upgrade to **Supabase Pro** |
| Railway credit exhausted / API down | Add Railway paid usage (~₹850–1,700/mo) |
| Live PhonePe + staff depend on POS 24/7 | Ensure Railway always-on (paid) |
| Commercial franchise / SLA needed | Upgrade **Vercel Pro** |
| Forever data retention (years) | **Supabase Pro** (8 GB, backups) |

**Strategy:** Start at ₹0 in May 2026. Budget ~₹6,000/month for long-run when you renew to Pro tiers.

---

## Environment quick reference

**Railway (backend):** see `backend/.env.example`  
**Vercel (frontend):** `VITE_API_URL=https://api.yourdomain.com/api`

Generate secrets:
```bash
openssl rand -base64 64
```

---

## Support & maintenance (ongoing)

| Task | Frequency |
|------|-----------|
| Dependency security updates | Monthly |
| Supabase backups verify | Monthly (Pro auto-backup) |
| Review Railway/Vercel usage | Monthly |
| JWT secret rotation | Yearly or on incident |
| DB size review | Quarterly (~1 GB / 10 yrs at 75 orders/day) |

---

*Document version: Phase 1 free (May 2026) → gradual upgrade to Pro stack. Security unchanged at every tier.*
