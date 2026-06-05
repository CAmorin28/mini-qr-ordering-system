/**
 * End-to-end API feature check for TableBite.
 * Run: node scripts/feature-check.mjs [baseUrl]
 * Default baseUrl: http://localhost:3000
 */

const BASE = (process.argv[2] ?? process.env.FEATURE_CHECK_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

class CookieJar {
  #cookies = new Map();

  store(response, url) {
    const raw =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [response.headers.get("set-cookie")].filter(Boolean);
    for (const line of raw) {
      const part = (Array.isArray(line) ? line[0] : line)?.split(";")[0];
      if (!part) continue;
      const eq = part.indexOf("=");
      if (eq < 1) continue;
      this.#cookies.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
    }
  }

  header() {
    if (this.#cookies.size === 0) return "";
    return [...this.#cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

const guestJar = new CookieJar();
const adminJar = new CookieJar();

async function request(path, options = {}, jar = null) {
  const headers = { ...(options.headers ?? {}) };
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const cookie = jar?.header();
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
    signal: options.signal,
  });

  jar?.store(res, path);
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data, text };
}

function makeOrder({ orderId, orderNumber, tableLetter = "T", paymentMethod = "cash" }) {
  const item = {
    id: "caesar-salad",
    name: "Caesar Salad",
    price: 12,
    category: "starters",
    imageUrl: null,
    emoji: "🥗",
  };
  const status =
    paymentMethod === "gcash"
      ? { status: "paid", paymentStatus: "paid" }
      : { status: "pending_payment", paymentStatus: "pending" };

  return {
    orderId,
    orderNumber,
    createdAt: new Date().toISOString(),
    readyAt: null,
    completedAt: null,
    ...status,
    lines: [{ item, quantity: 1 }],
    subtotal: 12,
    cutlery: false,
    paymentMethod,
    customer: {
      fullName: "Feature Check Bot",
      contactNumber: "09000000000",
      notes: "automated check",
      orderType: "dine_in",
      tableLetter,
    },
    grandTotal: 12,
  };
}

async function waitForServer(maxMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const { res } = await request("/api/health");
      if (res.status > 0) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function testSse(path, jar, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const headers = {};
    const cookie = jar?.header();
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(`${BASE}${path}`, { headers, signal: controller.signal });
    if (!res.ok) {
      fail(label, `HTTP ${res.status}`);
      return;
    }
    const reader = res.body?.getReader();
    if (!reader) {
      fail(label, "no body");
      return;
    }
    const { value } = await reader.read();
    await reader.cancel();
    const chunk = new TextDecoder().decode(value ?? new Uint8Array());
    if (chunk.includes("data:")) {
      pass(label, "received SSE event");
    } else {
      fail(label, "no SSE data in first chunk");
    }
  } catch (err) {
    if (err?.name === "AbortError") {
      fail(label, "timed out waiting for SSE");
    } else {
      fail(label, err instanceof Error ? err.message : String(err));
    }
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`\nTableBite feature check @ ${BASE}\n`);

  if (!(await waitForServer())) {
    console.error("Server not reachable. Start with: npm run dev");
    process.exit(1);
  }

  // --- Infrastructure ---
  console.log("Infrastructure");
  let dbConnected = false;
  {
    const { res, data } = await request("/api/health");
    if (res.ok && data?.database === "connected") {
      dbConnected = true;
      pass("Health endpoint", "database=connected");
    } else if (data?.database === "error") {
      fail("MySQL connection", data.message ?? "connection error");
    } else if (data?.database === "not_configured") {
      fail("MySQL configuration", "env vars missing");
    } else {
      fail("Health endpoint", `status ${res.status}`);
    }
  }

  // --- Menu (works without DB) ---
  console.log("\nMenu & products");
  {
    const { res, data } = await request("/api/menu?category=all");
    const count = data?.items?.length ?? 0;
    if (res.ok && count > 0) pass("Menu API", `${count} items`);
    else fail("Menu API", `status ${res.status}`);
  }
  {
    const { res, data } = await request("/api/products?category=mains");
    const count = data?.products?.length ?? 0;
    if (res.ok && count > 0) pass("Products API", `${count} mains`);
    else fail("Products API", `status ${res.status}`);
  }

  // --- Page routes ---
  console.log("\nPages");
  for (const [path, label] of [
    ["/", "Home"],
    ["/menu", "Menu"],
    ["/admin/login", "Admin login"],
    ["/orders", "Orders list"],
  ]) {
    try {
      const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
      if (res.status >= 200 && res.status < 400) pass(`Page ${label}`, `HTTP ${res.status}`);
      else if (res.status === 307 || res.status === 308)
        pass(`Page ${label}`, `redirect ${res.status}`);
      else fail(`Page ${label}`, `HTTP ${res.status}`);
    } catch (err) {
      fail(`Page ${label}`, err instanceof Error ? err.message : String(err));
    }
  }

  console.log("\nAdmin auth (no DB required)");
  {
    const { res, data } = await request("/api/admin/auth", {
      method: "POST",
      json: { username: "admin", password: "12345" },
    }, adminJar);
    if (res.ok && data?.ok) pass("Admin login");
    else fail("Admin login", data?.error ?? res.status);
  }

  if (!dbConnected) {
    console.log("\n⚠ Database unavailable — skipping order/admin/realtime DB checks.");
    console.log("  Fix MYSQL_PASSWORD in .env.local (MySQL Workbench password), then re-run.\n");
    printSummary();
    process.exit(1);
  }

  // --- Admin auth ---
  console.log("\nAdmin");
  {
    const { res, data } = await request("/api/admin/auth");
    if (res.ok) pass("Admin session probe", `authenticated=${data?.authenticated}`);
    else fail("Admin session probe", `status ${res.status}`);
  }
  {
    const { res, data } = await request("/api/admin/auth", {
      method: "POST",
      json: { username: "admin", password: "12345" },
    }, adminJar);
    if (res.ok) pass("Admin login");
    else fail("Admin login", data?.error ?? res.status);
  }
  {
    const { res, data } = await request("/api/admin/orders", {}, adminJar);
    const count = data?.orders?.length ?? 0;
    if (res.ok) pass("Admin list orders", `${count} orders`);
    else fail("Admin list orders", data?.error ?? res.status);
  }

  // --- Guest table session ---
  console.log("\nGuest table session");
  const testTable = "T";
  {
    const { res, data } = await request(`/api/table-visit?table=${testTable}`);
    if (res.ok && data?.tableLetter === testTable) {
      pass("Table visit status", `canBind=${data.canBind}`);
    } else {
      fail("Table visit status", data?.error ?? res.status);
    }
  }
  {
    const { res, data } = await request("/api/table-visit", {
      method: "POST",
      json: { table: testTable },
    }, guestJar);
    if (res.ok) pass("Open table visit / guest cookie", `visitOpen=${data?.visitOpen}`);
    else fail("Open table visit", data?.error ?? res.status);
  }
  {
    const { res, data } = await request("/api/guest-session", {}, guestJar);
    if (res.ok && (data?.valid === true || data?.enforced === false)) {
      pass("Guest session validate", `table=${data?.tableLetter ?? "n/a"}`);
    } else {
      fail("Guest session validate", data?.code ?? res.status);
    }
  }

  // --- Place orders (multi-order table flow) ---
  console.log("\nCustomer orders");
  const suffix = Date.now().toString(36);
  const orderA = makeOrder({
    orderId: `fc-a-${suffix}`,
    orderNumber: `FC-A-${suffix}`,
    tableLetter: testTable,
  });
  const orderB = makeOrder({
    orderId: `fc-b-${suffix}`,
    orderNumber: `FC-B-${suffix}`,
    tableLetter: testTable,
  });

  let placedA = null;
  let placedB = null;
  {
    const { res, data } = await request("/api/orders", { method: "POST", json: orderA }, guestJar);
    if (res.status === 201 && data?.orderId) {
      placedA = data.order ?? orderA;
      pass("Place order A", data.orderId);
    } else {
      fail("Place order A", data?.error ?? res.status);
    }
  }
  {
    const { res, data } = await request("/api/orders", { method: "POST", json: orderB }, guestJar);
    if (res.status === 201 && data?.orderId) {
      placedB = data.order ?? orderB;
      pass("Place order B (multi-order)", data.orderId);
    } else {
      fail("Place order B", data?.error ?? res.status);
    }
  }

  if (placedA) {
    const { res, data } = await request(`/api/orders/${encodeURIComponent(placedA.orderId)}`, {}, guestJar);
    if (res.ok && data?.order?.orderId === placedA.orderId) pass("Fetch order A by id");
    else fail("Fetch order A by id", data?.error ?? res.status);
  }

  if (placedA && placedB) {
    const { res, data } = await request(`/api/orders?table=${testTable}`, {}, guestJar);
    const ids = (data?.orders ?? []).map((o) => o.orderId);
    const hasBoth = ids.includes(placedA.orderId) && ids.includes(placedB.orderId);
    if (res.ok && hasBoth) pass("Table order history (multi)", `${ids.length} active`);
    else if (res.ok) fail("Table order history (multi)", `missing test orders in ${ids.length}`);
    else fail("Table order history", data?.error ?? res.status);
  }

  // --- Admin status updates + customer visibility ---
  console.log("\nAdmin status updates → customer");
  if (placedA && adminJar.header()) {
    const { res, data } = await request(
      `/api/admin/orders/${encodeURIComponent(placedA.orderId)}`,
      { method: "PATCH", json: { status: "preparing", paymentStatus: "pending" } },
      adminJar,
    );
    if (res.ok && data?.order?.status === "preparing") {
      pass("Admin update kitchen status", "preparing");
    } else {
      fail("Admin update kitchen status", data?.error ?? res.status);
    }

    const { res: cRes, data: cData } = await request(
      `/api/orders/${encodeURIComponent(placedA.orderId)}`,
      {},
      guestJar,
    );
    if (cRes.ok && cData?.order?.status === "preparing") {
      pass("Customer sees kitchen update");
    } else {
      fail("Customer sees kitchen update", `got ${cData?.order?.status ?? "n/a"}`);
    }

    const { res: pRes, data: pData } = await request(
      `/api/admin/orders/${encodeURIComponent(placedA.orderId)}`,
      { method: "PATCH", json: { paymentStatus: "paid" } },
      adminJar,
    );
    if (pRes.ok && pData?.order?.paymentStatus === "paid") {
      pass("Admin update payment status", "paid");
    } else {
      fail("Admin update payment status", pData?.error ?? pRes.status);
    }

    const { res: c2Res, data: c2Data } = await request(
      `/api/orders/${encodeURIComponent(placedA.orderId)}`,
      {},
      guestJar,
    );
    if (c2Res.ok && c2Data?.order?.paymentStatus === "paid") {
      pass("Customer sees payment update");
    } else {
      fail("Customer sees payment update", `got ${c2Data?.order?.paymentStatus ?? "n/a"}`);
    }
  } else {
    fail("Admin status updates", "skipped — no placed order or admin session");
  }

  // --- Realtime SSE ---
  console.log("\nRealtime (SSE)");
  if (placedA) {
    await testSse(
      `/api/orders/stream?orderId=${encodeURIComponent(placedA.orderId)}`,
      guestJar,
      "SSE single order",
    );
  }
  if (placedA && placedB) {
    await testSse(`/api/orders/stream?table=${testTable}`, guestJar, "SSE table (multi-order)");
    await testSse(
      `/api/orders/stream?orderIds=${encodeURIComponent(placedA.orderId)},${encodeURIComponent(placedB.orderId)}`,
      guestJar,
      "SSE orderIds (multi)",
    );
  }
  if (adminJar.header()) {
    await testSse("/api/admin/orders/stream", adminJar, "SSE admin board");
  }

  // --- Admin workflow: done + complete (order B only, leave A active for table) ---
  console.log("\nAdmin workflow (done → complete)");
  if (placedB && adminJar.header()) {
    for (const status of ["preparing", "serving", "served"]) {
      await request(
        `/api/admin/orders/${encodeURIComponent(placedB.orderId)}`,
        { method: "PATCH", json: { status, paymentStatus: "paid" } },
        adminJar,
      );
    }
    const { res, data } = await request(
      `/api/admin/orders/${encodeURIComponent(placedB.orderId)}`,
      { method: "PATCH", json: { status: "served", paymentStatus: "paid", ready: true } },
      adminJar,
    );
    if (res.ok && data?.order?.readyAt) pass("Admin mark Done", "readyAt set");
    else fail("Admin mark Done", data?.error ?? res.status);

    const { res: cRes, data: cData } = await request(
      `/api/admin/orders/${encodeURIComponent(placedB.orderId)}`,
      { method: "PATCH", json: { completed: true } },
      adminJar,
    );
    if (cRes.ok && cData?.order?.completedAt) pass("Admin complete order B");
    else fail("Admin complete order B", cData?.error ?? cRes.status);

    const { res: hRes, data: hData } = await request(`/api/orders?table=${testTable}`, {}, guestJar);
    const stillHasA = (hData?.orders ?? []).some((o) => o.orderId === placedA?.orderId);
    const bGone = !(hData?.orders ?? []).some((o) => o.orderId === placedB.orderId);
    if (hRes.ok && stillHasA && bGone) pass("Completed order B hidden from active list");
    else fail("Completed order B hidden", `A=${stillHasA} Bgone=${bGone}`);
  }

  // --- Walk-in order (no table) ---
  console.log("\nWalk-in order");
  const walkIn = makeOrder({
    orderId: `fc-walk-${suffix}`,
    orderNumber: `FC-W-${suffix}`,
    tableLetter: "",
  });
  {
    const { res, data } = await request("/api/orders", { method: "POST", json: walkIn });
    if (res.status === 201) {
      pass("Walk-in place order (no table)");
      const { res: gRes, data: gData } = await request(
        `/api/orders/${encodeURIComponent(walkIn.orderId)}`,
      );
      if (gRes.ok && gData?.order?.orderId === walkIn.orderId) pass("Walk-in fetch by id");
      else fail("Walk-in fetch by id", gData?.error ?? gRes.status);
    } else if (res.status === 401 && data?.code === "guest_session_required") {
      pass("Walk-in blocked on secured host (expected)", data.code);
    } else {
      fail("Walk-in place order", data?.error ?? res.status);
    }
  }

  printSummary();
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${"─".repeat(48)}`);
  console.log(`Results: ${passed}/${results.length} passed`);
  if (failed.length > 0) {
    console.log("\nFailed checks:");
    for (const f of failed) {
      console.log(`  • ${f.name}: ${f.detail || "failed"}`);
    }
    if (passed > 0) process.exit(1);
  } else {
    console.log("\nAll automated checks passed.\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
