/**
 * Responsive layout audit — mobile (390×844) and desktop (1280×800).
 * Run: node scripts/layout-check.mjs [baseUrl]
 */

import { chromium } from "playwright";

const BASE = (process.argv[2] ?? process.env.LAYOUT_CHECK_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

const VIEWPORTS = {
  mobile: { width: 390, height: 844, label: "Mobile (390×844)" },
  desktop: { width: 1280, height: 800, label: "Desktop (1280×800)" },
};

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function skip(name, detail = "") {
  results.push({ name, ok: true, detail: `SKIP: ${detail}`, skipped: true });
  console.log(`  ○ ${name} — skipped (${detail})`);
}

let dbConnected = false;

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.status > 0) {
        const data = await res.json().catch(() => ({}));
        dbConnected = data?.database === "connected";
        return true;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function checkNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const maxScroll = Math.max(doc.scrollWidth, body.scrollWidth);
    const client = doc.clientWidth;
    return { maxScroll, client, diff: maxScroll - client };
  });
  if (overflow.diff <= 2) {
    pass(`${label}: no horizontal overflow`, `scroll ${overflow.maxScroll}px / viewport ${overflow.client}px`);
    return true;
  }
  fail(`${label}: horizontal overflow`, `scroll ${overflow.maxScroll}px > viewport ${overflow.client}px (+${overflow.diff}px)`);
  return false;
}

async function checkElementInViewport(page, selector, label) {
  const locator = page.locator(selector).first();
  try {
    await locator.waitFor({ state: "visible", timeout: 8_000 });
  } catch {
    fail(`${label}: element missing`, selector);
    return false;
  }
  const box = await locator.boundingBox();
  if (!box) {
    fail(`${label}: element missing`, selector);
    return false;
  }
  const vp = page.viewportSize();
  const inView =
    box.x >= -2 &&
    box.y >= -2 &&
    box.x + box.width <= vp.width + 2 &&
    box.y + box.height <= vp.height + 2;
  if (inView) {
    pass(`${label}: visible in viewport`, selector);
    return true;
  }
  fail(
    `${label}: clipped/out of viewport`,
    `${selector} at (${Math.round(box.x)},${Math.round(box.y)}) ${Math.round(box.width)}×${Math.round(box.height)}`,
  );
  return false;
}

async function checkComputedLayout(page, name, fn) {
  try {
    const ok = await page.evaluate(fn);
    if (ok) pass(name);
    else fail(name, "layout assertion failed");
  } catch (err) {
    fail(name, err instanceof Error ? err.message : String(err));
  }
}

async function bindGuestSession(context) {
  const res = await context.request.post(`${BASE}/api/table-visit`, {
    data: { table: "T" },
  });
  return res.ok();
}

async function loginAdmin(context) {
  const res = await context.request.post(`${BASE}/api/admin/auth`, {
    data: { username: "admin", password: "12345" },
  });
  return res.ok();
}

async function auditPage(browser, viewportKey, pageDef) {
  const vp = VIEWPORTS[viewportKey];
  console.log(`\n${vp.label} — ${pageDef.name}`);

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: viewportKey === "mobile" ? 2 : 1,
    isMobile: viewportKey === "mobile",
    hasTouch: viewportKey === "mobile",
  });

  if (pageDef.needsGuest) {
    if (!dbConnected) {
      skip(`${vp.label} / ${pageDef.name}`, "MySQL not connected — needs guest session");
      await context.close();
      return;
    }
    const bound = await bindGuestSession(context);
    if (!bound) {
      fail(`${vp.label} / ${pageDef.name}: guest session`, "could not bind table T");
      await context.close();
      return;
    }
  }

  if (pageDef.needsAdmin) {
    const loggedIn = await loginAdmin(context);
    if (!loggedIn) {
      fail(`${pageDef.name}: admin session`, "login failed");
      await context.close();
      return;
    }
  }

  const page = await context.newPage();
  await page.goto(`${BASE}${pageDef.path}`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForTimeout(600);

  const prefix = `${vp.label} / ${pageDef.name}`;
  await checkNoHorizontalOverflow(page, prefix);

  for (const sel of pageDef.mustSee ?? []) {
    await checkElementInViewport(page, sel, `${prefix} / ${sel}`);
  }

  if (pageDef.layoutCheck) {
    await checkComputedLayout(page, `${prefix} / ${pageDef.layoutCheck.name}`, pageDef.layoutCheck.fn);
  }

  if (pageDef.interact) {
    await pageDef.interact(page, prefix, pass, fail);
  }

  await context.close();
}

async function main() {
  console.log(`\nTableBite layout check @ ${BASE}\n`);

  if (!(await waitForServer())) {
    console.error("Server not reachable. Start with: npm run dev");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });

  const pages = [
    {
      name: "Home redirect",
      path: "/",
      mustSee: ["h1, h2", "a, button"],
    },
    {
      name: "Access denied",
      path: "/menu/access-denied?reason=no_session",
      mustSee: ["h1, h2", "a, button"],
    },
    {
      name: "Menu enter (QR)",
      path: "/menu/enter?table=T",
      mustSee: ["h1, h2", "button, a"],
    },
    {
      name: "Menu (with session)",
      path: "/menu?table=T",
      needsGuest: true,
      mustSee: ["header", ".menu-grid, .menu-food-card", ".menu-checkout-bar"],
      layoutCheck: {
        name: "menu grid columns",
        fn: () => {
          const grid = document.querySelector(".menu-grid");
          if (!grid) return false;
          const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
          const w = window.innerWidth;
          if (w < 640) return cols === 2;
          if (w < 1024) return cols >= 2 && cols <= 3;
          return cols >= 3;
        },
      },
      async interact(page, prefix, passFn, failFn) {
        const cartBtn = page.locator('[data-cart-trigger], button[aria-label*="Cart"]');
        if ((await cartBtn.count()) > 0) {
          await cartBtn.first().click();
          await page.waitForTimeout(400);
          const panel = page.locator("#cart-panel");
          if (await panel.isVisible()) {
            passFn(`${prefix} / cart panel opens`);
            const box = await panel.boundingBox();
            const vp = page.viewportSize();
            if (box && box.x + box.width <= vp.width + 2) {
              passFn(`${prefix} / cart panel fits width`);
            } else {
              failFn(`${prefix} / cart panel fits width`, "panel overflows viewport");
            }
          } else {
            failFn(`${prefix} / cart panel opens`, "not visible after click");
          }
        }
      },
    },
    {
      name: "Checkout review",
      path: "/checkout/review",
      needsGuest: true,
      mustSee: ["header", "h1"],
      layoutCheck: {
        name: "checkout mobile footer vs desktop aside",
        fn: () => {
          const w = window.innerWidth;
          const mobileFooter = document.querySelector(".checkout-mobile-footer");
          const desktopAside = document.querySelector(".checkout-aside-actions--desktop");
          if (w < 1024) {
            if (!mobileFooter) return false;
            return getComputedStyle(mobileFooter).display !== "none";
          }
          if (!desktopAside) return true;
          return getComputedStyle(desktopAside).display !== "none";
        },
      },
    },
    {
      name: "Orders list",
      path: "/orders",
      needsGuest: true,
      mustSee: ["header", "h1"],
    },
    {
      name: "Admin login",
      path: "/admin/login",
      mustSee: [".admin-login-card, form", "input[type='password'], input[type='text']"],
      layoutCheck: {
        name: "admin login split layout",
        fn: () => {
          const page = document.querySelector(".admin-login-page");
          if (!page) return false;
          const cols = getComputedStyle(page).gridTemplateColumns;
          const w = window.innerWidth;
          if (w >= 1024) return cols.split(" ").length >= 2;
          return cols.split(" ").length === 1;
        },
      },
    },
    {
      name: "Admin dashboard",
      path: "/admin",
      needsAdmin: true,
      mustSee: [".admin-shell header", ".admin-main-grid", ".admin-view-tabs"],
      layoutCheck: {
        name: "admin stats grid",
        fn: () => {
          const grid = document.querySelector(".admin-main-grid");
          if (!grid) return false;
          const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
          const w = window.innerWidth;
          if (w < 640) return cols === 1;
          if (w < 1024) return cols === 2;
          return cols === 4;
        },
      },
    },
  ];

  for (const pageDef of pages) {
    for (const vpKey of Object.keys(VIEWPORTS)) {
      await auditPage(browser, vpKey, pageDef);
    }
  }

  await browser.close();

  const passed = results.filter((r) => r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${"─".repeat(52)}`);
  console.log(`Layout results: ${passed}/${results.length - skipped} passed${skipped ? `, ${skipped} skipped` : ""}`);
  if (!dbConnected) {
    console.log("\nNote: MySQL offline — menu/checkout/orders layout checks were skipped.");
    console.log("Fix MYSQL_PASSWORD in .env.local for full responsive audit.\n");
  }

  if (failed.length > 0) {
    console.log("\nFailed:");
    for (const f of failed) {
      console.log(`  • ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    }
    process.exit(1);
  }
  if (passed > 0) console.log("\nAll runnable layout checks passed.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
