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

The application is deployed and ready to use at:

**https://tablebite.vercel.app**

All system features — menu browsing, cart, checkout, payment, order tracking, admin dashboard, and QR security — can be tested on this live server. No local setup or configuration is required.

| Role | URL |
|------|-----|
| **Live app** | https://tablebite.vercel.app |
| **Staff login** | https://tablebite.vercel.app/admin/login |
| **Table QR generator** | https://tablebite.vercel.app/admin/qr |

You can also run the project on a **local network** for development (see [Local network environment](#local-network-environment)).

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

> **Important:** Opening https://tablebite.vercel.app/menu directly will show **Access Denied**. Always start by scanning a table QR from the admin panel. This confirms the security feature is working as designed.

**Staff QR generator (admin only):** `/admin/qr` — staff generate and print table codes here; this page is not for customers.

---

## How to test (live server)

Follow these steps to evaluate the full system on the deployed site.

### Step 1 — Open the live site

Go to **https://tablebite.vercel.app/admin/login** and sign in with the staff credentials provided by the project team.

### Step 2 — Generate a table QR code

1. Open **Table QR** at https://tablebite.vercel.app/admin/qr
2. Select a table letter and download or display the QR code

### Step 3 — Scan and order (customer flow)

1. Scan the QR code with a phone — do **not** open `/menu` directly
2. Browse the menu, add items to the cart, and proceed to checkout
3. Complete payment and view the order confirmation page

### Step 4 — Verify in admin

1. Return to the admin dashboard at https://tablebite.vercel.app/admin
2. Confirm the test order appears and update its status as needed

### Step 5 — Test QR security (optional)

| Test | Expected result |
|------|-----------------|
| Scan QR on Phone A | Menu loads; device is bound to the table |
| Copy the same URL to Phone B | Access Denied |
| Full order on Phone A | Menu → cart → checkout → payment → confirmation |

---

## Installation guide (local development)

Use this section only if you need to run the project on your own machine. Evaluators and reviewers can test everything on the [live server](#live-server) without installing anything.

### Prerequisites

- **Node.js 20.x** ([nodejs.org](https://nodejs.org))
- **npm** (included with Node.js)
- **MySQL 8.x** (local install or [MySQL Workbench](https://dev.mysql.com/downloads/workbench/))

### Step 1 — Clone and install

```bash
git clone <your-repository-url>
cd mini-qr-ordering-system
npm install
```

### Step 2 — Configure environment (`.env.local`)

The repo includes `.env.local` as a **template**. Each machine must set its own connection details — do not rely on another developer’s passwords or hostnames.

1. Open `.env.local` in the project root.
2. Set **`MYSQL_PASSWORD`** to your local MySQL root (or app user) password.
3. Adjust other values if your setup differs:

| Variable | What to set on your machine |
|----------|-----------------------------|
| `MYSQL_HOST` | Usually `127.0.0.1` for local MySQL |
| `MYSQL_PORT` | Usually `3306` |
| `MYSQL_USER` | Your MySQL username (e.g. `root`) |
| `MYSQL_PASSWORD` | **Required** — your MySQL password |
| `MYSQL_DATABASE` | `tablebite` (created by the schema script) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for desktop; use `http://YOUR_LAN_IP:3000` when testing QR on a phone (see [Local network environment](#local-network-environment)) |

Optional: set `ADMIN_USERNAME` and `ADMIN_PASSWORD` for staff login at `/admin/login`. If unset, defaults are `admin` / `12345`.

> **Security:** Never commit real passwords. Keep placeholders in git; only store your actual credentials in your local copy of `.env.local`.

### Step 3 — Create the database

Run the schema and seed data in MySQL Workbench (or the `mysql` CLI):

```bash
mysql -u root -p < database/schema.sql
```

Or open `database/schema.sql` in Workbench and execute the full script. This creates the `tablebite` database, tables, and sample menu items.

### Step 4 — Start the development server

```bash
npm run dev
```

The terminal shows two URLs:

| Label | Use for |
|-------|---------|
| **Local** | `http://localhost:3000` — desktop browser on this PC |
| **Network** | `http://192.168.x.x:3000` — phone or tablet on the same Wi‑Fi |

Confirm the database connection at **http://localhost:3000/api/health** (or your Network URL). A healthy response means MySQL is configured correctly.

> **Note:** If port 3000 is in use, stop the other process and run `npm run dev` again.

---

## Local network environment

Use this setup to test the QR flow on a real phone over Wi‑Fi when running the project locally.

### 1. Run the dev server

```bash
npm run dev
```

Note the **Network** address (e.g. `http://192.168.1.2:3000`).

### 2. Open the app from your LAN IP

On your **phone**, open the Network URL — not `localhost`.

- Admin: `http://192.168.1.2:3000/admin/login`
- Generate a table QR from `/admin/qr` while on the LAN URL

### 3. Test customer and security flows

| Test | Expected result |
|------|-----------------|
| Scan QR on Phone A | Menu loads; device is bound to the table |
| Copy URL to Phone B | Access Denied |
| Full order on Phone A | Menu → cart → checkout → payment → confirmation |
| Staff dashboard | Orders appear at `/admin` |

Local and live deployments use the same QR security rules and ordering workflow.

---

## Admin dashboard

| URL | Purpose |
|-----|---------|
| `/admin/login` | Staff sign in |
| `/admin` | Order dashboard after login |
| `/admin/qr` | Generate table QR codes |

Staff can view orders, update order status, update payment status, and manage table visits.

Protected admin API routes (require admin session cookie):

- `GET /api/admin/orders` — list orders
- `PATCH /api/admin/orders/:orderId` — update status and/or payment
- `POST /api/admin/auth` — sign in · `DELETE /api/admin/auth` — sign out

---

## API overview

All API routes are same-origin with the app:

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
| `lib/data/menu.ts` | Fallback menu data |
| `lib/db/` | MySQL data layer (orders, products, table visits, guest sessions) |
| `database/schema.sql` | MySQL schema and sample menu seed |
| `scripts/dev.mjs` | Local dev server launcher |
| `server/` | Optional legacy Express server (`npm run dev:express`) |

---

## Troubleshooting

### Database connection fails locally

- Check **http://localhost:3000/api/health** — if MySQL is unreachable, verify `.env.local` on **this machine** (especially `MYSQL_PASSWORD`, `MYSQL_USER`, and `MYSQL_HOST`).
- Ensure MySQL is running and you executed `database/schema.sql`.
- After changing `.env.local`, restart `npm run dev`.

### “Access Denied” when I expected the menu

- You must **scan the table QR** first; opening `/menu` directly is blocked by design.
- If you copied a link to another phone, only the **original scanning device** is allowed.
- Scan the QR again on the device you will use to order.

### QR code opens the wrong address on my phone (local dev)

- Use the **Network** URL (`http://192.168.x.x:3000`) on your phone, not `localhost`.
- Open `/admin/qr` from the same LAN URL before generating or updating the QR.

### Port 3000 already in use (`EADDRINUSE`)

Something else on the PC is already using port 3000 (often a leftover dev server from an earlier run).

**Automatic fix (updated project):** `npm run dev` now tries the next free port (3001, 3002, …) and prints the URL to open.

**Manual fix on Windows:**

1. Find what is using port 3000:
   ```powershell
   netstat -ano | findstr :3000
   ```
2. Note the **PID** in the last column, then stop it:
   ```powershell
   taskkill /PID <PID> /F
   ```
3. Run `npm run dev` again.

**Or use a different port:**

```powershell
$env:PORT=3001; npm run dev
```

Then open **http://localhost:3001** (use that port in the LAN URL if testing on a phone).

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
