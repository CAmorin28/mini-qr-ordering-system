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
import { pathWithTable, tableLetterFromSearch } from "@/lib/menu-url";
import {
  TABLE_SESSION_STORAGE_KEY,
  formatTableLabel,
  normalizeTableLetter,
} from "@/lib/table-session";

interface TableSessionContextValue {
  tableLetter: string;
  tableLabel: string;
  hasTableSession: boolean;
  setTableLetter: (letter: string) => void;
  pathWithSession: (path: string) => string;
}

const defaultValue: TableSessionContextValue = {
  tableLetter: "",
  tableLabel: "",
  hasTableSession: false,
  setTableLetter: () => {},
  pathWithSession: (path) => path,
};

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

  const value = useMemo(
    () => ({
      tableLetter,
      tableLabel: formatTableLabel(tableLetter),
      hasTableSession: Boolean(tableLetter),
      setTableLetter,
      pathWithSession,
    }),
    [tableLetter, setTableLetter, pathWithSession],
  );

  return (
    <TableSessionContext.Provider value={value}>
      <Suspense fallback={null}>
        <TableSessionSync tableLetter={tableLetter} setTableLetterState={setTableLetterState} />
      </Suspense>
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
