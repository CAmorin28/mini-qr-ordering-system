"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  Suspense,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchTableVisitStatus } from "@/lib/api-table-visit";
import { clearServerGuestSession, fetchGuestSessionStatus } from "@/lib/api-guest-session";
import {
  GUEST_ACCESS_DENIED_PATH,
  guestAccessDeniedUrl,
} from "@/lib/guest-session-paths";
import { isGuestQrSecurityEnabledClient } from "@/lib/guest-qr-security";
import {
  MENU_PAGE_PATH,
  TABLE_ENTER_PAGE_PATH,
  pathWithoutTable,
  pathWithTable,
  tableLetterFromSearch,
} from "@/lib/menu-url";
import { useTableVisitEndSync } from "@/app/hooks/useTableVisitEndSync";
import { clearTableCustomerSession } from "@/lib/customer-table-session";
import {
  TABLE_SESSION_STORAGE_KEY,
  TABLE_VISIT_ENDED_EVENT,
  clearTableVisitEndedMark,
  formatTableLabel,
  isTableVisitEnded,
  markTableVisitEnded,
  normalizeTableLetter,
  type TableVisitEndedDetail,
} from "@/lib/table-session";

interface TableSessionContextValue {
  tableLetter: string;
  tableLabel: string;
  /** True only after scanning a table QR (?table=). Walk-in orders use no table session. */
  hasTableSession: boolean;
  setTableLetter: (letter: string) => void;
  /** End table QR visit: clear storage, mark visit ended, hide session UI. */
  clearTableSession: () => void;
  pathWithSession: (path: string) => string;
}

const defaultValue: TableSessionContextValue = {
  tableLetter: "",
  tableLabel: "",
  hasTableSession: false,
  setTableLetter: () => {},
  clearTableSession: () => {},
  pathWithSession: (path) => path,
};

const CUSTOMER_PATH_PREFIXES = ["/menu", "/checkout", "/orders"];

/** Order receipt/status pages — keep accessible while the device session is still valid. */
function isPostOrderCustomerPath(pathname: string): boolean {
  return (
    pathname.startsWith("/checkout/confirmation") ||
    pathname.startsWith("/orders")
  );
}

const TableSessionContext = createContext<TableSessionContextValue>(defaultValue);

function TableSessionSync({
  tableLetter,
  setTableLetterState,
}: {
  tableLetter: string;
  setTableLetterState: (letter: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Routes that carry ?table= before a guest session exists (or by design).
    if (
      pathname.startsWith("/admin") ||
      pathname === TABLE_ENTER_PAGE_PATH ||
      pathname === GUEST_ACCESS_DENIED_PATH
    ) {
      return;
    }

    const fromUrl = tableLetterFromSearch(searchParams.toString());
    if (fromUrl) {
      if (isTableVisitEnded(fromUrl)) {
        sessionStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
        router.replace(pathWithoutTable(pathname) || MENU_PAGE_PATH);
        return;
      }

      let cancelled = false;

      (async () => {
        if (isGuestQrSecurityEnabledClient()) {
          const guest = await fetchGuestSessionStatus();
          if (cancelled) return;

          if (guest?.enforced !== false) {
            if (!guest?.valid || normalizeTableLetter(guest.tableLetter) !== fromUrl) {
              sessionStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
              router.replace(pathWithTable(TABLE_ENTER_PAGE_PATH, fromUrl));
              return;
            }
          }
        }

        const status = await fetchTableVisitStatus(fromUrl);
        if (cancelled) return;

        if (status && !status.canBind) {
          markTableVisitEnded(fromUrl);
          sessionStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
          void clearServerGuestSession();
          if (
            isGuestQrSecurityEnabledClient() &&
            !isPostOrderCustomerPath(pathname)
          ) {
            if (!status.visitOpen) {
              router.replace(guestAccessDeniedUrl("visit_ended"));
              return;
            }
            router.replace(guestAccessDeniedUrl("device_locked"));
            return;
          }
          router.replace(pathWithoutTable(pathname) || MENU_PAGE_PATH);
          return;
        }

        if (status?.canBind ?? true) {
          clearTableVisitEndedMark(fromUrl);
          setTableLetterState(fromUrl);
          sessionStorage.setItem(TABLE_SESSION_STORAGE_KEY, fromUrl);
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    if (tableLetter) return;

    const stored = normalizeTableLetter(
      sessionStorage.getItem(TABLE_SESSION_STORAGE_KEY),
    );
    if (!stored) return;

    if (isTableVisitEnded(stored)) {
      sessionStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
      return;
    }

    let cancelled = false;

    (async () => {
      if (isGuestQrSecurityEnabledClient()) {
        const guest = await fetchGuestSessionStatus();
        if (cancelled) return;

        if (guest?.enforced !== false) {
          if (!guest?.valid || normalizeTableLetter(guest.tableLetter) !== stored) {
            sessionStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
            router.replace(pathWithTable(TABLE_ENTER_PAGE_PATH, stored));
            return;
          }
        }
      }

      const status = await fetchTableVisitStatus(stored);
      if (cancelled) return;

      if (status && !status.canBind) {
        markTableVisitEnded(stored);
        sessionStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
        void clearServerGuestSession();
        if (
          isGuestQrSecurityEnabledClient() &&
          !isPostOrderCustomerPath(pathname)
        ) {
          if (!status.visitOpen) {
            router.replace(guestAccessDeniedUrl("visit_ended"));
            return;
          }
          router.replace(guestAccessDeniedUrl("device_locked"));
        }
        return;
      }

      setTableLetterState(stored);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, tableLetter, setTableLetterState, pathname, router]);

  return null;
}

function TableVisitEndSync({ tableLetter }: { tableLetter: string }) {
  useTableVisitEndSync(tableLetter);
  return null;
}

export function TableSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tableLetter, setTableLetterState] = useState("");

  const setTableLetter = useCallback(
    (letter: string) => {
      const normalized = normalizeTableLetter(letter);
      if (!normalized) return;
      clearTableVisitEndedMark(normalized);
      setTableLetterState(normalized);
      sessionStorage.setItem(TABLE_SESSION_STORAGE_KEY, normalized);

      if (pathname.startsWith("/menu") || pathname === "/") {
        router.replace(pathWithTable("/menu", normalized));
      }
    },
    [pathname, router],
  );

  const pathWithSession = useCallback(
    (path: string) => pathWithTable(path, tableLetter),
    [tableLetter],
  );

  const applySessionCleared = useCallback(() => {
    setTableLetterState("");
    sessionStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
    const onCustomerRoute = CUSTOMER_PATH_PREFIXES.some((p) => pathname.startsWith(p));
    if (onCustomerRoute) {
      router.replace(pathWithoutTable(pathname) || MENU_PAGE_PATH);
    }
  }, [pathname, router]);

  const clearTableSession = useCallback(() => {
    const letter = normalizeTableLetter(tableLetter);
    if (letter) {
      clearTableCustomerSession(letter);
      return;
    }
    applySessionCleared();
  }, [tableLetter, applySessionCleared]);

  useEffect(() => {
    function onVisitEnded(event: Event) {
      const { tableLetter: endedTable } = (event as CustomEvent<TableVisitEndedDetail>)
        .detail;
      if (!endedTable || normalizeTableLetter(tableLetter) !== endedTable) return;
      applySessionCleared();
    }
    window.addEventListener(TABLE_VISIT_ENDED_EVENT, onVisitEnded);
    return () => window.removeEventListener(TABLE_VISIT_ENDED_EVENT, onVisitEnded);
  }, [tableLetter, applySessionCleared]);

  const value = useMemo(
    () => ({
      tableLetter,
      tableLabel: formatTableLabel(tableLetter),
      hasTableSession: Boolean(tableLetter),
      setTableLetter,
      clearTableSession,
      pathWithSession,
    }),
    [tableLetter, setTableLetter, clearTableSession, pathWithSession],
  );

  return (
    <TableSessionContext.Provider value={value}>
      <Suspense fallback={null}>
        <TableSessionSync tableLetter={tableLetter} setTableLetterState={setTableLetterState} />
      </Suspense>
      <TableVisitEndSync tableLetter={tableLetter} />
      {children}
    </TableSessionContext.Provider>
  );
}

export function useTableSession() {
  return useContext(TableSessionContext);
}

export function useOptionalTableSession(): TableSessionContextValue {
  return useContext(TableSessionContext);
}
