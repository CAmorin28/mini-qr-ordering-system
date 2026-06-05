# TableBite — Mini QR Ordering System

TableBite is a restaurant ordering system where customers scan a table QR code on their phone, browse the menu, add items to a cart, and complete checkout. Staff manage orders and generate table QR codes from an admin dashboard.

Built with **Next.js**, **React**, **Tailwind CSS**, and API **Route Handlers** (`/api/menu`, `/api/orders`).

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | **Next.js**, **React**, **Tailwind CSS** |
| API | Next.js **Route Handlers** (`app/api/*`) |
| Database | **MySQL** (`mysql2`) |
| Deployment | **Vercel** (live server) |
| Other | TypeScript, QR code generation, PDF receipts |

---

## Live server

The deployed application is available at:

**https://tablebite.vercel.app**

> Update this URL in the README if your production domain changes.

You can test **all system features** using either:

- the **live server** link above, or  
- a **local network deployment** on your own machine (see [Local network environment](#local-network-environment)).

Both environments use the same QR security rules and ordering workflow.

---

## QR access and “Access Denied”

TableBite requires customers to **scan a table QR code** before they can use the menu. This is intentional.

| Action | Result |
|--------|--------|
| Open `/menu` directly in a browser (no QR scan) | **Access Denied** |
| Copy or share a menu link to another device | **Access Denied** on the other device |
| Scan the table QR with the phone that will order | Menu, cart, checkout, and payment work normally |

**Why this happens**

- Each table QR opens `/menu/enter?table=X`, which binds the session to **one device**.
- Shared, forwarded, or manually typed URLs cannot bypass this check.
- This validates the intended security and ordering workflow for dine-in QR ordering.

**Correct customer flow:** Scan QR → menu → cart → checkout → payment → order confirmation.

**Staff QR generator (admin only):** `/admin/qr` — not for customers; staff generate and print table codes here.

---

## Installation guide

Follow these steps to set up the project from scratch.

### Prerequisites

- **Node.js 20.x** ([nodejs.org](https://nodejs.org))
- **npm** (included with Node.js)
- **MySQL 8** (local install, MySQL Workbench, or a cloud host such as Aiven)
- A phone on the same Wi‑Fi network (optional, for testing QR scans locally)

### Step 1 — Clone and install dependencies

```bash
git clone <your-repository-url>
cd mini-qr-ordering-system
npm install
```

### Step 2 — Configure environment variables

Copy the example file and edit it for your machine:

```bash
cp .env.example .env.local
```

Minimum settings for local development:

| Variable | Example | Purpose |
|----------|---------|---------|
| `MYSQL_HOST` | `127.0.0.1` | MySQL host |
| `MYSQL_PORT` | `3306` | MySQL port |
| `MYSQL_USER` | `root` | Database user |
| `MYSQL_PASSWORD` | *(your password)* | Database password |
| `MYSQL_DATABASE` | `tablebite` | Database name |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Base URL used in QR codes |
| `ADMIN_PASSWORD` | *(your password)* | Staff login password (recommended) |

> **Note:** Never commit `.env.local`. It contains secrets and is ignored by Git.

For cloud MySQL (e.g. Aiven), also set `MYSQL_SSL=true` and `MYSQL_SSL_CA` — see `.env.example`.

### Step 3 — Set up the database

1. Open **MySQL Workbench** (or your preferred MySQL client).
2. Run the full script **`database/schema.sql`**.
   - Creates the `tablebite` database
   - Creates tables: `products`, `orders`, `table_visits`, `guest_qr_sessions`
   - Seeds sample menu items
3. Confirm the connection using the same credentials in `.env.local`.

Without MySQL, the menu falls back to local data and order APIs return **503 Database not configured**.

### Step 4 — Start the development server

```bash
npm run dev
```

The terminal shows two URLs:

| Label | Use for |
|-------|---------|
| **Local** | `http://localhost:3000` — desktop browser on this PC |
| **Network** | `http://192.168.x.x:3000` — phone or tablet on the same Wi‑Fi |

> **Note:** If port 3000 is in use, stop the other process and run `npm run dev` again.

### Step 5 — Sign in to admin and generate a table QR

1. Open **http://localhost:3000/admin/login**
2. Sign in (default: username `admin`, password `12345` — override with `ADMIN_USERNAME` / `ADMIN_PASSWORD` in production)
3. Go to **Table QR** (`/admin/qr`), choose a table letter, and download or display the QR code
4. Scan the QR with a phone to start the customer ordering flow

---

## Local network environment

Use this setup to test the full QR flow on a real phone over Wi‑Fi.

### 1. Run the dev server

```bash
npm run dev
```

Note the **Network** address (e.g. `http://192.168.1.2:3000`).

### 2. Open the app from your LAN IP

On your **phone**, open the Network URL — not `localhost`.

- Admin: `http://192.168.1.2:3000/admin/login`
- Generate a table QR from `/admin/qr` while on the LAN URL so the encoded link matches your network address

> **Tip:** If QR codes still point to `localhost`, open the admin QR page using your LAN IP. The app adjusts QR targets when it detects a network address.

### 3. Test customer and security flows

| Test | Expected result |
|------|-----------------|
| Scan QR on Phone A | Menu loads; device is bound to the table |
| Copy URL to Phone B | Access Denied |
| Full order on Phone A | Menu → cart → checkout → payment → confirmation |
| Staff dashboard | Orders appear at `/admin` |

QR device binding is **enabled by default** on localhost, LAN IP, and production. To disable locally only (not recommended for workflow testing):

```env
GUEST_QR_SECURITY=false
NEXT_PUBLIC_GUEST_QR_SECURITY=false
```

---

## Live server environment

Use the live deployment when you do not need to run the project locally.

### Accessing the live site

| Role | URL |
|------|-----|
| **Live app (customers)** | https://tablebite.vercel.app |
| **Staff login** | https://tablebite.vercel.app/admin/login |
| **Table QR generator** | https://tablebite.vercel.app/admin/qr |

### Testing on the live server

1. Sign in to the admin dashboard on the live URL.
2. Generate or download a table QR code from **Table QR**.
3. Scan the code with a phone — do **not** open `/menu` directly.
4. Place a test order and confirm it appears in the admin dashboard.

> **Important:** Opening https://tablebite.vercel.app/menu directly will show **Access Denied**. Always start by scanning the table QR. This confirms the security feature is working as designed.

### Deploying updates (maintainers)

1. Push changes to GitHub (or GitLab / Bitbucket).
2. Import or connect the repo in [Vercel](https://vercel.com/new).
3. Set environment variables under **Settings → Environment Variables**:

| Name | Notes |
|------|--------|
| `MYSQL_*` | Production database credentials |
| `ADMIN_PASSWORD` | Strong staff password |
| `NEXT_PUBLIC_APP_URL` | `https://tablebite.vercel.app` (or your custom domain) |
| `GUEST_SESSION_SECRET` | Long random string for session signing |

4. Deploy with **Build command:** `npm run build`
5. After changing env vars or the domain, **redeploy** and **re-download** QR codes from the live admin panel.

---

## Admin dashboard

| URL | Purpose |
|-----|---------|
| `/admin/login` | Staff sign in (username + password — no public sign-up) |
| `/admin` | Order dashboard after login |
| `/admin/qr` | Generate table QR codes |

Default credentials (override in production):

- **Username:** `admin`
- **Password:** `12345`

Staff can view orders, update order status, update payment status, and manage table visits.

Protected admin API routes (require admin session cookie):

- `GET /api/admin/orders` — list orders
- `PATCH /api/admin/orders/:orderId` — update status and/or payment
- `POST /api/admin/auth` — sign in · `DELETE /api/admin/auth` — sign out

---

## API overview

All API routes are same-origin with the app (local or Vercel):

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/health` | App and database status |
| `GET` | `/api/menu?category=all` | Menu items |
| `GET` | `/api/products?category=all` | Products (same data as menu) |
| `POST` | `/api/orders` | Create an order after checkout |
| `GET` | `/api/orders?table=A` | Active orders for a table |
| `GET` | `/api/orders/:orderId` | Single order |
| `POST` | `/api/table-visit` | Open table visit after QR scan |
| `GET` | `/api/guest-session` | Validate device-bound session |

---

## Project structure

| Path | Purpose |
|------|---------|
| `app/` | Pages and UI components |
| `app/api/` | Serverless API routes (Vercel-compatible) |
| `lib/data/menu.ts` | Fallback menu when MySQL is unavailable |
| `lib/db/` | MySQL data layer (orders, products, table visits, guest sessions) |
| `database/schema.sql` | MySQL schema and sample menu seed |
| `scripts/dev.mjs` | Local dev server launcher |
| `server/` | Optional legacy Express server (`npm run dev:express`) |

See `lib/db/README.md` for database module details.

---

## Troubleshooting

### “Access Denied” when I expected the menu

- You must **scan the table QR** first; opening `/menu` directly is blocked by design.
- If you copied a link to another phone, only the **original scanning device** is allowed.
- Scan the QR again on the device you will use to order.

### QR code opens the wrong address on my phone

- Use the **Network** URL (`http://192.168.x.x:3000`) on your phone, not `localhost`.
- Open `/admin/qr` from the same LAN URL before generating or updating the QR.

### Orders fail with “Database not configured”

- Check `.env.local` MySQL variables and restart `npm run dev`.
- Run `database/schema.sql` in MySQL Workbench.
- Visit `/api/health` to confirm database connectivity.

### Port 3000 already in use

- Stop any other `next dev` or Node process on port 3000, then run `npm run dev` again.

### QR security seems off locally

- QR binding is **on by default** in all environments.
- Ensure `guest_qr_sessions` exists (from `schema.sql`).
- Restart the dev server after changing `.env.local`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (localhost + LAN) |
| `npm run build` | Production build |
| `npm start` | Run production build locally |
| `npm run lint` | Run ESLint |
| `npm run dev:express` | Optional legacy Express + Next server (not used on Vercel) |

---

## License

This project was developed as part of an OJT / academic capstone. Refer to your institution or repository owner for usage terms.
