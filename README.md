# TableBite — Mini QR Ordering System

Food ordering UI with menu filtering, cart, and checkout. Built with **Next.js**, **React**, **Tailwind CSS**, and API **Route Handlers** (`/api/menu`, `/api/orders`).

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional: run the legacy Express + Next custom server (local only, not used on Vercel):

```bash
npm run dev:express
```

## Deploy on Vercel

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. Import the project in [Vercel](https://vercel.com/new).
3. Use the defaults:
   - **Framework:** Next.js
   - **Build command:** `npm run build`
   - **Output:** automatic
4. Deploy.

### QR codes on Vercel (important)

Scanned QR codes open the **menu** at `/menu`, not the staff QR page.

| Who | URL |
|-----|-----|
| Customer (scan) | `https://your-domain.com/menu` |
| Staff (Show QR) | `https://your-domain.com/qr?view=staff` |

**Recommended for Production:** add an environment variable in Vercel → **Settings → Environment Variables**:

| Name | Value | Environment |
|------|--------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://your-production-domain.vercel.app` (or your custom domain) | **Production** |

Use your real live URL (no trailing path). This keeps downloaded/printed QR codes on the correct domain, including custom domains.

After changing env vars, **redeploy** and **re-download** the QR from **Show QR** on the live site.

If someone opens `/qr` without `?view=staff` (e.g. an old link), Vercel middleware redirects them to `/menu`.

API routes are served on the same domain as the app:

- `GET /api/health` — app + database status
- `GET /api/products?category=all` — products from Supabase
- `GET /api/menu?category=all` — alias of products (`items` key)
- `POST /api/orders` — save a completed order
- `GET /api/orders` — list recent orders
- `GET /api/orders/:orderId` — single order

## Supabase database

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run `supabase/schema.sql` then `supabase/seed.sql`.
3. Add environment variables (local `.env.local` and Vercel → Settings → Environment Variables):

| Name | Notes |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** — required for POST/GET orders |

4. Redeploy on Vercel after saving env vars.

Tables: **`products`**, **`orders`** (order line items stored in `orders.lines` as JSON).

## Project structure

| Path | Purpose |
|------|---------|
| `app/` | Pages and UI components |
| `app/api/` | Serverless API (Vercel-compatible) |
| `lib/data/menu.ts` | Menu data |
| `lib/orders.ts` | Order validation |
| `server/` | Optional local Express server only |
