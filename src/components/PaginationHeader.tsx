
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (pageNumber: number) => void;
  disabled?: boolean;
}

export function PaginationHeader({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: PaginationProps) {
    const onFirstPage = currentPage <= 1;
    const onLastPage = currentPage >= totalPages;

    return (
         <Pagination
            aria-disabled={disabled}
            className={disabled ? "pointer-events-none opacity-50" : undefined}
         >
            {/* flex-row-reverse: first JSX child renders rightmost */}
            <PaginationContent className="flex flex-row-reverse w-full">
              {!onLastPage && <PaginationItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PaginationLink href="#" aria-label="Go to last page" onClick={(e) => { e.preventDefault(); if (!disabled) onPageChange(totalPages); }}>
                      <ChevronsRight />
                    </PaginationLink>
                  </TooltipTrigger>
                  <TooltipContent>Last page</TooltipContent>
                </Tooltip>
              </PaginationItem>}

              {!onLastPage && <PaginationItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PaginationLink href="#" aria-label="Go to next page" onClick={(e) => { e.preventDefault(); if (!disabled) onPageChange(currentPage + 1); }}>
                      <ChevronRight />
                    </PaginationLink>
                  </TooltipTrigger>
                  <TooltipContent>Next page</TooltipContent>
                </Tooltip>
              </PaginationItem>}

              {!onFirstPage && <PaginationItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PaginationLink href="#" aria-label="Go to previous page" onClick={(e) => { e.preventDefault(); if (!disabled) onPageChange(currentPage - 1); }}>
                      <ChevronLeft />
                    </PaginationLink>
                  </TooltipTrigger>
                  <TooltipContent>Previous page</TooltipContent>
                </Tooltip>
              </PaginationItem>}

              {!onFirstPage && <PaginationItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PaginationLink href="#" aria-label="Go to first page" onClick={(e) => { e.preventDefault(); if (!disabled) onPageChange(1); }}>
                      <ChevronsLeft />
                    </PaginationLink>
                  </TooltipTrigger>
                  <TooltipContent>First page</TooltipContent>
                </Tooltip>
              </PaginationItem>}
            </PaginationContent>
          </Pagination>
    )
}
