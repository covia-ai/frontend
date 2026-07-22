
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { ChevronsLeft, ChevronsRight } from "lucide-react"

interface PaginationProps {
 currentPage:number,
 totalPages:number,
 nextPage(pageNo:number):any,
 prevPage(pageNo:number):any,
 disabled?:boolean
}

export function PaginationHeader({currentPage, totalPages,nextPage,prevPage,disabled=false } : PaginationProps) {
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
                <PaginationLink href="#" aria-label="Go to last page" onClick={(e) => { e.preventDefault(); if (!disabled) nextPage(totalPages); }}>
                  <ChevronsRight />
                </PaginationLink>
              </PaginationItem>}

              {!onLastPage && <PaginationItem>
                <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (!disabled) nextPage(currentPage + 1); }} />
              </PaginationItem>}

              {!onFirstPage && <PaginationItem>
                <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (!disabled) prevPage(currentPage - 1); }} />
              </PaginationItem>}

              {!onFirstPage && <PaginationItem>
                <PaginationLink href="#" aria-label="Go to first page" onClick={(e) => { e.preventDefault(); if (!disabled) prevPage(1); }}>
                  <ChevronsLeft />
                </PaginationLink>
              </PaginationItem>}
            </PaginationContent>
          </Pagination>
    )
}