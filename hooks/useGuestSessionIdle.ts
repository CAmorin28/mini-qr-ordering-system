"use client";

import { useEffect, useRef } from "react";
import {
  fetchGuestSessionStatus,
  guestSessionBoundToTable,
  touchGuestSessionActivity,
} from "@/lib/client/api-guest-session";
import { fetchOrderHistory } from "@/lib/client/api";
import { clearTableCustomerSession } from "@/lib/client/customer-table-session";
import { isGuestQrSecurityEnabledClient } from "@/lib/shared/guest-qr-security";
import { activePlacedOrdersForTable } from "@/lib/client/order-status-nav";
import { orderBlocksIdleSessionRelease } from "@/lib/shared/order-workflow";
import { normalizeTableLetter } from "@/lib/shared/table-session";

const IDLE_MS = 5 * 60 * 1000;
const ACTIVITY_TOUCH_MS = 30_000;
const SESSION_CHECK_MS = 15_000;

async function idleReleaseBlockedByOrder(tableLetter: string): Promise<boolean> {
  try {
    const orders = await fetchOrderHistory(tableLetter);
    const active = activePlacedOrdersForTable(orders, tableLetter);
    return active.some(orderBlocksIdleSessionRelease);
  } catch {
    return false;
  }
}

/** End the table session after 5 minutes without guest interaction. */
export function useGuestSessionIdle(tableLetter: string) {
  const table = normalizeTableLetter(tableLetter);
  const lastActivityRef = useRef(Date.now());
  const lastTouchRef = useRef(0);

  useEffect(() => {
    if (!table || !isGuestQrSecurityEnabledClient()) {
      return undefined;
    }

    let stopped = false;
    let idleTimer: ReturnType<typeof setInterval> | undefined;
    let verifyTimer: ReturnType<typeof setInterval> | undefined;

    const events: (keyof WindowEventMap)[] = [
      "click",
      "keydown",
      "scroll",
      "touchstart",
      "pointerdown",
    ];

    function markActive() {
      lastActivityRef.current = Date.now();
      const now = Date.now();
      if (now - lastTouchRef.current < ACTIVITY_TOUCH_MS) return;
      lastTouchRef.current = now;
      void touchGuestSessionActivity();
    }

    async function onIdleTimeout() {
      if (await idleReleaseBlockedByOrder(table)) return;
      clearTableCustomerSession(table, { releaseServerSlot: true });
    }

    async function verifySessionStillValid() {
      if (!(await guestSessionBoundToTable(table))) return;
      if (Date.now() - lastActivityRef.current >= IDLE_MS) {
        await onIdleTimeout();
        return;
      }

      const status = await fetchGuestSessionStatus(table);
      if (status?.enforced !== false && status?.valid === false) {
        clearTableCustomerSession(table, { releaseServerSlot: false });
      }
    }

    async function startIdleTracking() {
      if (!(await guestSessionBoundToTable(table)) || stopped) return;

      lastActivityRef.current = Date.now();
      lastTouchRef.current = 0;

      for (const eventName of events) {
        window.addEventListener(eventName, markActive, { passive: true });
      }

      markActive();

      idleTimer = setInterval(() => {
        if (Date.now() - lastActivityRef.current >= IDLE_MS) {
          void onIdleTimeout();
        }
      }, SESSION_CHECK_MS);

      verifyTimer = setInterval(() => {
        void verifySessionStillValid();
      }, SESSION_CHECK_MS);
    }

    void startIdleTracking();

    return () => {
      stopped = true;
      for (const eventName of events) {
        window.removeEventListener(eventName, markActive);
      }
      if (idleTimer !== undefined) clearInterval(idleTimer);
      if (verifyTimer !== undefined) clearInterval(verifyTimer);
    };
  }, [table]);
}
