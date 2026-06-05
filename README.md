# TableBite — Mini QR Ordering System

Food ordering UI with menu filtering, cart, and checkout. Built with **Next.js**, **React**, **Tailwind CSS**, and API **Route Handlers** (`/api/menu`, `/api/orders`).

## Local development

Use **one** dev server on **http://localhost:3000** (menu, checkout, admin, and `/api/*` are all same-origin).

```bash
npm install
cp .env.example .env.local   # optional MySQL + admin vars
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Set `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local` so QR codes always point at that URL (not `127.0.0.1`, LAN IP, or port 3002).

If port 3000 is already in use, stop the other `next dev` process and run `npm run dev` again.

Optional legacy Express + Next server (not used on Vercel): `npm run dev:express`

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
| Staff (Table QR) | `https://your-domain.com/admin/qr` |

**Recommended for Production:** add an environment variable in Vercel → **Settings → Environment Variables**:

| Name | Value | Environment |
|------|--------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://your-production-domain.vercel.app` (or your custom domain) | **Production** |

Use your real live URL (no trailing path). This keeps downloaded/printed QR codes on the correct domain, including custom domains.

After changing env vars, **redeploy** and **re-download** the QR from **Show QR** on the live site.

If someone opens `/qr?view=staff` (legacy staff link), middleware redirects them to `/admin/qr`.
Otherwise `/qr` stays as the guest “scan to order” page.

API routes are served on the same domain as the app:

- `GET /api/health` — app + database status
- `GET /api/products?category=all` — products (local menu until MySQL is wired)
- `GET /api/menu?category=all` — alias of products (`items` key)
- `POST /api/orders` — save a completed order
- `GET /api/orders` — list recent orders
- `GET /api/orders/:orderId` — single order

### Admin dashboard

| URL | Purpose |
|-----|---------|
| `/admin/login` | Staff sign in (username + password only — no sign up) |
| `/admin` | Dashboard after login |

Default credentials: **username** `admin`, **password** `12345`. Override with `ADMIN_USERNAME` / `ADMIN_PASSWORD` in env for production.

- View recent orders
- Update order status and payment status

Protected API routes (require admin session cookie):

- `GET /api/admin/orders` — list orders
- `PATCH /api/admin/orders/:orderId` — update `status` and/or `paymentStatus`
- `POST /api/admin/auth` — sign in (`username`, `password`) · `DELETE /api/admin/auth` — sign out

## MySQL database

Persistence is implemented in `lib/db/` (see `lib/db/README.md`). Until MySQL is connected:

- Menu uses `lib/data/menu.ts`
- Order APIs return **503 Database not configured**
- Table QR flow works in dev without a database

1. Create a MySQL database and run `database/schema-reference.sql` (adapt as needed).
2. Implement `lib/db/orders.ts`, `products.ts`, `table-visits.ts`, and `isDatabaseConfigured()` in `lib/db/config.ts`.
3. Add environment variables (local `.env.local` and Vercel → Settings → Environment Variables):

| Name | Notes |
|------|--------|
| `MYSQL_HOST` | Database host |
| `MYSQL_PORT` | Default `3306` |
| `MYSQL_USER` / `MYSQL_PASSWORD` | **Server only** |
| `MYSQL_DATABASE` | Database name |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | **Server only** — optional override for `/admin/login` |

4. Redeploy on Vercel after saving env vars.

Tables: **`products`**, **`orders`** (`lines` as JSON), **`table_visits`**.

## Project structure

| Path | Purpose |
|------|---------|
| `app/` | Pages and UI components |
| `app/api/` | Serverless API (Vercel-compatible) |
| `lib/data/menu.ts` | Menu data (default until MySQL products) |
| `lib/db/` | MySQL data layer (implement here) |
| `database/schema-reference.sql` | Reference MySQL schema |
| `lib/orders.ts` | Order validation |
| `server/` | Optional local Express server only |
