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
import { MENU_PAGE_PATH, pathWithoutTable, pathWithTable, tableLetterFromSearch } from "@/lib/menu-url";
import { useTableVisitEndSync } from "@/app/hooks/useTableVisitEndSync";
import {
  TABLE_SESSION_STORAGE_KEY,
  TABLE_VISIT_ENDED_EVENT,
  formatTableLabel,
  normalizeTableLetter,
  type TableVisitEndedDetail,
} from "@/lib/table-session";

interface TableSessionContextValue {
  tableLetter: string;
  tableLabel: string;
  hasTableSession: boolean;
  setTableLetter: (letter: string) => void;
  /** End QR session: clear storage and strip ?table= from customer routes. */
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

const TableSessionContext = createContext<TableSessionContextValue>(defaultValue);

function TableSessionSync({
  tableLetter,
  setTableLetterState,
}: {
  tableLetter: string;
  setTableLetterState: (letter: string) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const fromUrl = tableLetterFromSearch(searchParams.toString());
    if (fromUrl) {
      setTableLetterState(fromUrl);
      sessionStorage.setItem(TABLE_SESSION_STORAGE_KEY, fromUrl);
      return;
    }

    if (tableLetter) return;

    const stored = normalizeTableLetter(sessionStorage.getItem(TABLE_SESSION_STORAGE_KEY));
    if (stored) {
      setTableLetterState(stored);
    }
  }, [searchParams, tableLetter, setTableLetterState]);

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

  const clearTableSession = useCallback(() => {
    setTableLetterState("");
    sessionStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
    const onCustomerRoute = CUSTOMER_PATH_PREFIXES.some((p) => pathname.startsWith(p));
    if (onCustomerRoute) {
      router.replace(pathWithoutTable(pathname) || MENU_PAGE_PATH);
    }
  }, [pathname, router]);

  useEffect(() => {
    function onVisitEnded(event: Event) {
      const { tableLetter: endedTable } = (event as CustomEvent<TableVisitEndedDetail>)
        .detail;
      if (!endedTable || normalizeTableLetter(tableLetter) !== endedTable) return;
      clearTableSession();
    }
    window.addEventListener(TABLE_VISIT_ENDED_EVENT, onVisitEnded);
    return () => window.removeEventListener(TABLE_VISIT_ENDED_EVENT, onVisitEnded);
  }, [tableLetter, clearTableSession]);

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
