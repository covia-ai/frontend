"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [resetKey]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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
