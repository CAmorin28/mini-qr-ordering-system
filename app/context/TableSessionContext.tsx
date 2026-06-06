"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  Suspense,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchTableVisitStatus } from "@/lib/api-table-visit";
import { fetchGuestSessionStatus } from "@/lib/api-guest-session";
import { isGuestQrSecurityEnabledClient } from "@/lib/guest-qr-security";
import {
  TABLE_ENTER_PAGE_PATH,
  MENU_PAGE_PATH,
  pathWithTable,
  tableLetterFromSearch,
} from "@/lib/menu-url";
import { useTableVisitEndSync } from "@/app/hooks/useTableVisitEndSync";
import { useGuestSessionIdle } from "@/app/hooks/useGuestSessionIdle";
import { clearTableCustomerSession } from "@/lib/customer-table-session";
import {
  TABLE_SESSION_STORAGE_KEY,
  TABLE_VISIT_ENDED_EVENT,
  formatTableLabel,
  isCustomerOrderingPath,
  isTableVisitEnded,
  normalizeTableLetter,
  resolveTerminatedTableLetter,
  type TableVisitEndedDetail,
} from "@/lib/table-session";

interface TableSessionContextValue {
  tableLetter: string;
  tableLabel: string;
  hasTableSession: boolean;
  setTableLetter: (letter: string) => void;
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

const TableSessionContext = createContext<TableSessionContextValue>(defaultValue);

function bindTableLetter(
  letter: string,
  setTableLetterState: (letter: string) => void,
  currentLetter = "",
): void {
  const normalized = normalizeTableLetter(letter);
  if (!normalized) return;
  if (
    currentLetter === normalized &&
    sessionStorage.getItem(TABLE_SESSION_STORAGE_KEY) === normalized
  ) {
    return;
  }
  setTableLetterState(normalized);
  sessionStorage.setItem(TABLE_SESSION_STORAGE_KEY, normalized);
}

function TableSessionSync({
  tableLetter,
  setTableLetterState,
  setSessionReady,
}: {
  tableLetter: string;
  setTableLetterState: (letter: string) => void;
  setSessionReady: (ready: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirectTargetRef = useRef<string | null>(null);
  const [sessionCheckEpoch, setSessionCheckEpoch] = useState(0);

  const redirectToEnter = useCallback(
    (letter: string) => {
      const target = pathWithTable(TABLE_ENTER_PAGE_PATH, letter);
      if (redirectTargetRef.current === target) return;
      redirectTargetRef.current = target;
      window.location.replace(target);
    },
    [],
  );

  const redirectToBoundTable = useCallback((boundTable: string) => {
    const normalized = normalizeTableLetter(boundTable);
    if (!normalized) return false;
    const target = pathWithTable(MENU_PAGE_PATH, normalized);
    if (redirectTargetRef.current === target) return true;
    redirectTargetRef.current = target;
    window.location.replace(target);
    return true;
  }, []);

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });

  function handleGuestSessionForUrl(
    guest: Awaited<ReturnType<typeof fetchGuestSessionStatus>>,
    fromUrl: string,
  ): "ok" | "redirected" | "invalid" {
    if (!guest || guest.enforced === false) return "ok";

    const bound = normalizeTableLetter(guest.tableLetter);
    if (!guest.valid) {
      if (guest.code === "guest_table_mismatch" && bound) {
        redirectToBoundTable(bound);
        return "redirected";
      }
      return "invalid";
    }

    if (bound && bound !== fromUrl) {
      redirectToBoundTable(bound);
      return "redirected";
    }

    return "ok";
  }

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        setSessionCheckEpoch((epoch) => epoch + 1);
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    function onVisitEnded(event: Event) {
      const { tableLetter: endedTable } = (event as CustomEvent<TableVisitEndedDetail>)
        .detail;
      if (!endedTable || !isCustomerOrderingPath(pathname)) return;
      setSessionReady(false);
      redirectToEnter(endedTable);
    }
    window.addEventListener(TABLE_VISIT_ENDED_EVENT, onVisitEnded);
    return () => window.removeEventListener(TABLE_VISIT_ENDED_EVENT, onVisitEnded);
  }, [pathname, redirectToEnter, setSessionReady]);

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname === TABLE_ENTER_PAGE_PATH) {
      redirectTargetRef.current = null;
      return;
    }

    const fromUrl = tableLetterFromSearch(searchParams.toString());
    const stored = normalizeTableLetter(
      sessionStorage.getItem(TABLE_SESSION_STORAGE_KEY),
    );

    if (isCustomerOrderingPath(pathname)) {
      const endedTable = resolveTerminatedTableLetter(fromUrl, tableLetter, stored);
      if (endedTable) {
        sessionStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
        setSessionReady(false);
        redirectToEnter(endedTable);
        return;
      }
    }

    if (fromUrl) {
      if (isTableVisitEnded(fromUrl)) {
        setSessionReady(false);
        redirectToEnter(fromUrl);
        return;
      }

      let cancelled = false;

      (async () => {
        let guest: Awaited<ReturnType<typeof fetchGuestSessionStatus>> = null;
        if (isGuestQrSecurityEnabledClient()) {
          guest = await fetchGuestSessionStatus(fromUrl);
          if (
            cancelled ||
            (guest?.enforced !== false &&
              guest?.valid !== true &&
              guest !== null)
          ) {
            await wait(300);
            if (cancelled) return;
            guest = await fetchGuestSessionStatus(fromUrl);
          }
          if (cancelled) return;

          if (guest === null) {
            setSessionReady(false);
            redirectToEnter(fromUrl);
            return;
          }

          if (guest.enforced !== false) {
            const outcome = handleGuestSessionForUrl(guest, fromUrl);
            if (outcome === "redirected") return;
            if (outcome === "invalid") {
              setSessionReady(false);
              redirectToEnter(fromUrl);
              return;
            }
          }
        }

        const status = await fetchTableVisitStatus(fromUrl);
        if (cancelled) return;

        const guestSessionValid =
          !isGuestQrSecurityEnabledClient() ||
          guest?.enforced === false ||
          (guest?.valid === true &&
            normalizeTableLetter(guest.tableLetter) === fromUrl);

        if (status && !status.canBind && !guestSessionValid) {
          setSessionReady(false);
          redirectToEnter(fromUrl);
          return;
        }

        redirectTargetRef.current = null;
        bindTableLetter(fromUrl, setTableLetterState, tableLetter);
        setSessionReady(true);
      })();

      return () => {
        cancelled = true;
      };
    }

    redirectTargetRef.current = null;

    if (tableLetter) {
      const endedFromState = resolveTerminatedTableLetter(
        tableLetter,
        fromUrl,
        stored,
      );
      if (endedFromState) {
        sessionStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
        setSessionReady(false);
        redirectToEnter(endedFromState);
        return;
      }
      setSessionReady(true);
      return;
    }

    if (!stored) {
      setSessionReady(false);
      if (
        isCustomerOrderingPath(pathname) ||
        pathname === MENU_PAGE_PATH ||
        pathname === "/"
      ) {
        router.replace(TABLE_ENTER_PAGE_PATH);
      }
      return;
    }

    if (isTableVisitEnded(stored)) {
      sessionStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
      setSessionReady(false);
      redirectToEnter(stored);
      return;
    }

    let cancelled = false;

    (async () => {
      let guest: Awaited<ReturnType<typeof fetchGuestSessionStatus>> = null;
      if (isGuestQrSecurityEnabledClient()) {
        guest = await fetchGuestSessionStatus(stored);
        if (cancelled) return;

        if (guest === null) {
          setSessionReady(false);
          redirectToEnter(stored);
          return;
        }

        if (guest.enforced !== false) {
          const outcome = handleGuestSessionForUrl(guest, stored);
          if (outcome === "redirected") return;
          if (outcome === "invalid") {
            setSessionReady(false);
            redirectToEnter(stored);
            return;
          }
        }
      }

      const status = await fetchTableVisitStatus(stored);
      if (cancelled) return;

      const guestSessionValid =
        !isGuestQrSecurityEnabledClient() ||
        guest?.enforced === false ||
        (guest?.valid === true &&
          normalizeTableLetter(guest.tableLetter) === stored);

      if (status && !status.canBind && !guestSessionValid) {
        setSessionReady(false);
        redirectToEnter(stored);
        return;
      }

      bindTableLetter(stored, setTableLetterState, tableLetter);
      setSessionReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    searchParams,
    tableLetter,
    setTableLetterState,
    pathname,
    redirectToEnter,
    redirectToBoundTable,
    setSessionReady,
    router,
    sessionCheckEpoch,
  ]);

  return null;
}

function TableVisitEndSync({
  tableLetter,
  enabled,
}: {
  tableLetter: string;
  enabled: boolean;
}) {
  useTableVisitEndSync(enabled ? tableLetter : "");
  useGuestSessionIdle(enabled ? tableLetter : "");
  return null;
}

export function TableSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tableLetter, setTableLetterState] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  const setTableLetter = useCallback(
    (letter: string) => {
      const normalized = normalizeTableLetter(letter);
      if (!normalized) return;
      bindTableLetter(normalized, setTableLetterState, tableLetter);
      setSessionReady(true);

      if (pathname.startsWith("/menu") || pathname === "/") {
        router.replace(pathWithTable("/menu", normalized));
      }
    },
    [pathname, router, tableLetter],
  );

  const pathWithSession = useCallback(
    (path: string) => pathWithTable(path, tableLetter),
    [tableLetter],
  );

  const applySessionCleared = useCallback(() => {
    setTableLetterState("");
    setSessionReady(false);
    sessionStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
  }, []);

  const clearTableSession = useCallback(() => {
    const letter = normalizeTableLetter(tableLetter);
    if (letter) {
      clearTableCustomerSession(letter, { releaseServerSlot: true });
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
        <TableSessionSync
          tableLetter={tableLetter}
          setTableLetterState={setTableLetterState}
          setSessionReady={setSessionReady}
        />
      </Suspense>
      <TableVisitEndSync tableLetter={tableLetter} enabled={sessionReady} />
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
