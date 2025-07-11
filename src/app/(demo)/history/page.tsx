
"use client";

import Link from "next/link";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";

import { Search } from "@/components/search";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";

import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import {  RunStatus } from "@/lib/covia/covialib";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

export default function OperationsPage() {
 const [statusFilter, setStatusFilter] = useState("All");
 const [dateFilter, setDateFilter] = useState("All");
 const [jobsData, setJobsData] = useState<Object[]>([]);
  
 const [currentPage, setCurrentPage] = useState(1)
 const itemsPerPage = 5
 const [totalItems, setTotalItems] = useState(0);
 const [totalPages, setTotalPages] = useState(0);

 const handlePageChange = (page: number) => {
    if(page >= 1)
         setCurrentPage(page)
  }

 function isInRange(date:string) {
  console.log(date)
  if(dateFilter == "today") {
     const x = new Date().getDay();
     const y = new Date(date).getDay();
     console.log(x)
     console.log(y)
     console.log(x == y)
    if(x == y) return true;
  
    return false;
  
   }
  }
  const venue = useStore(useVenue, (x) => x).venue;
    if (!venue) return null;
       useEffect(() => {
              venue.getJobs().then(( jobs) => {
                 setTotalItems(jobs.length)
                 setTotalPages(Math.ceil(jobs.length / itemsPerPage))
                 jobs.forEach((jobId) => {
                    venue.getJob(jobId).then( (metadata) =>{
                      setJobsData(prevArray => [...prevArray, metadata]);
                     
                    })
                 })
                
              
             })
       }, []);
 
    function renderJSONObject(jsonObject: JSON, type: string) {
          if(jsonObject != undefined) {
            
                let keys = Object.keys(jsonObject);       
                
                if(keys != undefined && keys.length > 0) {
                
                  return (
                      <Table className="border border-slate-200 rounded-md py-2">
                         
                          <TableBody >
                              {keys.map((key,index) => (
                              <TableRow key={index}>
                                  <TableCell key={index} className="text-left">{key}</TableCell>
                                  <TableCell className="text-center ">{jsonObject[key]}</TableCell>
                              </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                      
                  )
                }
                else {
                    return (
                       <div>
                         {type == "input" && 
                            <Table className="border border-slate-200 rounded-md py-2">
                         
                          <TableBody >
                              <TableRow key={0}>
                                  <TableCell key={0} className="text-center">--</TableCell>
                                  <TableCell className="text-center ">--</TableCell>
                              </TableRow>
                            
                          </TableBody>
                      </Table>
                          }
                         {type == "output" && <div>--</div>}
                       </div>

                    )
                }
          }
    }
      
  return (
    <ContentLayout title="Operations">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>User History</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
       <div className="flex flex-col items-center justify-center  mt-8">
        <Search></Search>
        <div className="flex flex-row w-full  items-start justify-start mt-4 space-x-4 ">
         <Select onValueChange={value => setStatusFilter(value)} defaultValue="All">
        <SelectTrigger className="w-[180px] text-semibold">
          <SelectValue className="text-semibold" placeholder="Run Status" />
        </SelectTrigger>
      <SelectContent>
        <SelectGroup>
           <SelectItem value="All">All</SelectItem>
           <SelectItem value={RunStatus.COMPLETE}>{RunStatus.COMPLETE}</SelectItem>
           <SelectItem value={RunStatus.INPROGRESS}>{RunStatus.INPROGRESS}</SelectItem>
           <SelectItem value={RunStatus.FAILED}>{RunStatus.FAILED}</SelectItem>
        </SelectGroup>
      </SelectContent>
        </Select>
        <Select onValueChange={value => setDateFilter(value)} defaultValue="today">
          <SelectTrigger className="w-[180px] text-semibold">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
               <SelectItem value="All">All</SelectItem>
              <SelectItem value="today">Today</SelectItem>
             
            </SelectGroup>
          </SelectContent>
        </Select>
        </div>
                    <div className="text-slate-600 text-xs flex flex-row ">Page {currentPage}</div> 

           <Table className=" my-8 border border-slate-200 rounded-lg shadow-md">
              <TableHeader >
                <TableRow className="hover:bg-slate-800 bg-slate-800 rounded-full text-white ">
                  <TableCell className="text-center border border-slate-400">Job Id</TableCell>
                  <TableCell className="text-center border border-slate-400">Execution Date</TableCell>
                  <TableCell className="text-center border border-slate-400   ">Inputs
                      <TableRow className=" border border-slate-400 bg-slate-400 p-2 rounded-lg text-xs mt-2 p-0 grid grid-cols-2 items-start">
                          <TableCell className=" text-left ">Name</TableCell>
                          <TableCell  className=" text-left  ">Value</TableCell>
                      </TableRow>
                  </TableCell>
                  <TableCell className="text-center border border-slate-400   ">Outputs
                       <TableRow className=" border border-slate-400 bg-slate-400 p-2 rounded-lg text-xs mt-2 p-0 grid grid-cols-2 items-start">
                          <TableCell className=" text-left">Name</TableCell>
                          <TableCell  className=" text-left  ">Value</TableCell>
                      </TableRow>
                  </TableCell>

                  <TableCell className="text-center">Run Status</TableCell>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                  { jobsData.slice((currentPage-1)*itemsPerPage, (currentPage-1)*itemsPerPage+itemsPerPage).map((job,index) => 
                       (statusFilter == "All" || statusFilter == job.status)  && 
                        (dateFilter == "All"  || isInRange(job.created))  &&
                       (<TableRow key={index}>
                          <TableCell className="text-center"><Link className="hover:text-pink-400 hover:text-underline" href={`/runs/${job.id}`}>{job.id}</Link></TableCell>
                          <TableCell className="text-center">{new Date(job.created).toLocaleString()}</TableCell>
                          <TableCell className="text-center">{renderJSONObject(job?.input, "input")}</TableCell>
                          {job.status == RunStatus.COMPLETE    &&    <TableCell className="text-center">{renderJSONObject(job.output, "output")}</TableCell>}
                          {job.status == RunStatus.FAILED      &&    
                          <TableCell className="text-center">
                            <Table className="border border-slate-200 rounded-md py-2">
                              <TableBody >
                              <TableRow key={0}>
                                  <TableCell key={0} className="text-center">Error</TableCell>
                                  {job.error.length > 20 && <TableCell className="text-center max-w-sm">{job.error.slice(0, 20)+" ..."}</TableCell>}
                                  {job.error.length <= 20 && <TableCell className="text-center max-w-sm">{job.error}</TableCell>}

                              </TableRow>

                            
                          </TableBody>
                          </Table>  
                            
                          </TableCell>}
                          {job.status == RunStatus.PENDING     &&    <TableCell className="text-center">......</TableCell>}

                          {job.status == RunStatus.COMPLETE    &&   <TableCell className="text-green-600 text-center">{RunStatus.COMPLETE}</TableCell>}
                          {job.status == RunStatus.FAILED      &&   <TableCell className="text-red-600 text-center">{RunStatus.FAILED}</TableCell>}
                          {job.status == RunStatus.PENDING     &&   <TableCell className="text-blue-600 text-center">{RunStatus.PENDING}</TableCell>}
                       </TableRow>
                       )
                  )}
              </TableBody>
            </Table>

           <Pagination>
              <PaginationContent>
                {currentPage != 1 && <PaginationItem>
                  <PaginationPrevious href="#" onClick={() => handlePageChange(currentPage - 1)}/>
                </PaginationItem>}
                {currentPage != totalPages && <PaginationItem>
                  <PaginationNext href="#" onClick={() => handlePageChange(currentPage + 1)} />
                </PaginationItem>}
              </PaginationContent>
            </Pagination>
          
    
    </div>
       
    </ContentLayout>
  );
}
