
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface PaginationProps {
 currentPage:number,
 totalPages:number,
 nextPage(pageNo:number):any,  
 prevPage(pageNo:number):any
}

export function PaginationHeader({currentPage, totalPages,nextPage,prevPage } : PaginationProps) {

    return (
         <Pagination>
            <PaginationContent className="flex flex-row-reverse w-full">
              {currentPage != totalPages && currentPage < totalPages && <PaginationItem>
                <PaginationNext href="#" onClick={() => nextPage(currentPage + 1)} />
              </PaginationItem>}

              {currentPage != 1 && <PaginationItem>
                <PaginationPrevious href="#" onClick={() => prevPage(currentPage - 1)} />
              </PaginationItem>}
            </PaginationContent>
          </Pagination>
    )
}