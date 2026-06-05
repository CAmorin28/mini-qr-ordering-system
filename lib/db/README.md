# Database layer (MySQL)

Supabase has been removed. Implement persistence here:

| Module | Tables / responsibility |
|--------|------------------------|
| `config.ts` | Set `isDatabaseConfigured()` when `MYSQL_*` env vars are valid |
| `orders.ts` | `orders` — CRUD, `ready_at`, `completed_at` |
| `products.ts` | `products` — menu items (fallback: `lib/data/menu.ts`) |
| `table-qr-session.ts` | `table_qr_visits`, `qr_sessions`, `qr_ended_sessions` — visit cycle, active device slot, session history |

Use `order-mapper.ts` to map DB rows ↔ `PlacedOrder`.

Suggested env (add to `.env.local` when ready):

```
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_DATABASE=tablebite
```

Run `database/schema.sql` in MySQL (schema + sample menu). Or open the menu once (auto-seeds from `lib/data/menu.ts` when `products` is empty).
