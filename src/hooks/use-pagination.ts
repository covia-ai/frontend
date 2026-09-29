"use client";

import { useCallback, useMemo, useState, type SetStateAction } from "react";

type PageNumberOptions = {
  totalItems: number;
  pageSize: number;
  resetKey?: string;
};

export function usePageNumber({
  totalItems,
  pageSize,
  resetKey,
}: PageNumberOptions) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  // The chosen page is stored with the filter identity it was chosen under, so
  // a new identity reads as page one in the same render — nothing has to reset
  // it a frame later. A result set that shrinks pulls the page back into range
  // the same way: the clamp is applied on read, never written back.
  const [chosen, setChosen] = useState<{ resetKey?: string; page: number }>({ resetKey, page: 1 });
  const currentPage = Math.min(chosen.resetKey === resetKey ? chosen.page : 1, totalPages);

  const setCurrentPage = useCallback(
    (update: SetStateAction<number>) => {
      setChosen((previous) => {
        const base = Math.min(previous.resetKey === resetKey ? previous.page : 1, totalPages);
        return { resetKey, page: typeof update === "function" ? update(base) : update };
      });
    },
    [resetKey, totalPages],
  );

  return { currentPage, setCurrentPage, totalPages };
}

export function useClientPagination<T>({
  items,
  pageSize,
  resetKey,
}: {
  items: T[];
  pageSize: number;
  resetKey?: string;
}) {
  const page = usePageNumber({
    totalItems: items.length,
    pageSize,
    resetKey,
  });
  const pageItems = useMemo(
    () =>
      items.slice(
        (page.currentPage - 1) * pageSize,
        page.currentPage * pageSize,
      ),
    [items, page.currentPage, pageSize],
  );

  return { ...page, pageItems };
}
