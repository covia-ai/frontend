
"use client";
/* eslint-disable */

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
import { getExecutionTime } from "@/lib/utils";

export default function OperationsPage() {
 const [statusFilter, setStatusFilter] = useState("All");
 const [dateFilter, setDateFilter] = useState("All");
 const [jobsData, setJobsData] = useState<object[]>([]);
 const [filteredData, setFilteredData] = useState<object[]>([]);
 const [currentPage, setCurrentPage] = useState(1)
 const itemsPerPage = 10
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
                      setFilteredData(prevArray => [...prevArray, metadata])
                    })
                 })
                
              
             })
       }, []);
 
    useEffect(() => {
           setFilteredData([]);
           if(statusFilter == 'All')
             setFilteredData(jobsData)
           else {
                jobsData.forEach((job) => {
                if(job.status == statusFilter) {
                  setFilteredData(prevArray => [...prevArray, job])
                }
            })
          }
       }, [statusFilter]);
      
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
       <div className="flex flex-col items-center justify-center  mt-2">
        <Search></Search>
        <div className="flex flex-row w-full  items-start justify-start mt-4 space-x-4 ">
         <Select onValueChange={value => setStatusFilter(value)} defaultValue="All">
        <SelectTrigger className="w-[180px] text-semibold">
          <SelectValue className="text-semibold" placeholder="Run Status" />
        </SelectTrigger>
      <SelectContent>
        <SelectGroup>
           <SelectItem value="All">All</SelectItem>
           <SelectItem value={RunStatus.PENDING}>{RunStatus.PENDING}</SelectItem>
           <SelectItem value={RunStatus.STARTED}>{RunStatus.STARTED}</SelectItem>
           <SelectItem value={RunStatus.COMPLETE}>{RunStatus.COMPLETE}</SelectItem>
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
            <div className="text-slate-600 text-xs flex flex-row ">Page {currentPage} : Showing {filteredData.slice((currentPage-1)*itemsPerPage, (currentPage-1)*itemsPerPage+itemsPerPage).length} of {jobsData.length} </div> 

           <Pagination>
              <PaginationContent className=" flex flex-row-reverse w-full">
                {currentPage != 1 && <PaginationItem>
                  <PaginationPrevious href="#" onClick={() => handlePageChange(currentPage - 1)}/>
                </PaginationItem>}
                {currentPage != totalPages && <PaginationItem>
                  <PaginationNext href="#" onClick={() => handlePageChange(currentPage + 1)} />
                </PaginationItem>}
              </PaginationContent>
            </Pagination>

           <Table className="  border border-slate-200 rounded-lg shadow-md">
              <TableHeader >
                <TableRow className="hover:bg-slate-800 bg-slate-800 rounded-full text-white ">
                  <TableCell className="text-center border border-slate-400">Job Id</TableCell>
                  <TableCell className="text-center border border-slate-400">Created Date</TableCell>
                   <TableCell className="text-center border border-slate-400">Execution Time</TableCell>
               
                  <TableCell className="text-center">Run Status</TableCell>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                  { filteredData.slice((currentPage-1)*itemsPerPage, (currentPage-1)*itemsPerPage+itemsPerPage).map((job,index) => 
                     
                       <TableRow key={index}>
                          <TableCell className="text-center"><Link className="text-secondary underline" href={`/runs/${job.id}`}>{job.id}</Link></TableCell>
                          <TableCell className="text-center">{new Date(job.created).toLocaleString()}</TableCell>
                          {(job.status == RunStatus.COMPLETE || job.status == RunStatus.FAILED) && (<TableCell className="text-center">{getExecutionTime(job.created,job.updated)}</TableCell>)}
                          {(job.status == RunStatus.PENDING || job.status == RunStatus.STARTED) && (<TableCell className="text-center">--</TableCell>)}


                          {job.status == RunStatus.COMPLETE    &&   <TableCell className="text-green-600 text-center">{RunStatus.COMPLETE}</TableCell>}
                          {job.status == RunStatus.FAILED      &&   <TableCell className="text-red-600 text-center">{RunStatus.FAILED}</TableCell>}
                          {job.status == RunStatus.PENDING     &&   <TableCell className="text-blue-600 text-center">{RunStatus.PENDING}</TableCell>}
                          {job.status == RunStatus.STARTED   &&   <TableCell className="text-blue-600 text-center">{RunStatus.STARTED}</TableCell>}

                       </TableRow>
                       
                  )}
              </TableBody>
            </Table>

          
    
    </div>
       
    </ContentLayout>
  );
}
