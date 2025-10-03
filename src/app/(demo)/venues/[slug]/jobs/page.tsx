
"use client";

import Link from "next/link";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";

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
import { RunStatus, Venue } from "@/lib/covia";

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
import { Label } from "@/components/ui/label";

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
    if (page >= 1)
      setCurrentPage(page)
  }

  function isInRange(date: string) {
    if (dateFilter == "today") {
      const x = new Date().getDay();
      const y = new Date(date).getDay();
      if (x == y) return true;

      return false;

    }
  }
 const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  if (!venueObj) return null;
  const venue = new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId})

  useEffect(() => {
    venue.getJobs().then((jobs) => {
      setTotalItems(jobs.length)
      setTotalPages(Math.ceil(jobs.length / itemsPerPage))
      jobs.forEach((jobId) => {
        venue.getJob(jobId).then((metadata) => {
          setJobsData(prevArray => [...prevArray, metadata]);
          setFilteredData(prevArray => [...prevArray, metadata])
        })
      })


    })
  }, []);

  useEffect(() => {
    setFilteredData([]);
    if (statusFilter == 'All')
      setFilteredData(jobsData)
    else {
      jobsData.forEach((job) => {
        if (job.status == statusFilter) {
          setFilteredData(prevArray => [...prevArray, job])
        }
      })
    }
    // Apply sorting by created date
    filteredData.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }, [statusFilter]);

  return (
    <ContentLayout title="Operations">
      <SmartBreadcrumb />
      <div className="flex flex-col items-center justify-center  mt-2">
        <div className="flex flex-row w-full  items-start justify-start mt-4 space-x-4 ">
            <div className="flex flex-row items-center justify-start w-1/3  space-x-4">
              <Label>Job Status</Label>
              <Select onValueChange={value => setStatusFilter(value)} defaultValue="All">
              <SelectTrigger className="w-[180px] text-semibold">
                <SelectValue className="text-semibold" placeholder="Run Status" />
              </SelectTrigger>    
              <SelectContent>
                <SelectGroup>
                  
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value={RunStatus.PENDING}>{RunStatus.PENDING}</SelectItem>
                  <SelectItem value={RunStatus.STARTED}>{RunStatus.STARTED}</SelectItem>
                  <SelectItem value={RunStatus.PAUSED}>{RunStatus.PAUSED}</SelectItem>
                  <SelectItem value={RunStatus.CANCELLED}>{RunStatus.CANCELLED}</SelectItem>
                  <SelectItem value={RunStatus.TIMEOUT}>{RunStatus.TIMEOUT}</SelectItem>
                  <SelectItem value={RunStatus.REJECTED}>{RunStatus.REJECTED}</SelectItem>
                  <SelectItem value={RunStatus.AUTH_REQUIRED}>{RunStatus.AUTH_REQUIRED}</SelectItem>
                  <SelectItem value={RunStatus.INPUT_REQUIRED}>{RunStatus.INPUT_REQUIRED}</SelectItem>
                  <SelectItem value={RunStatus.COMPLETE}>{RunStatus.COMPLETE}</SelectItem>
                  <SelectItem value={RunStatus.FAILED}>{RunStatus.FAILED}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-slate-600 text-xs flex flex-row ">Page {currentPage} : Showing {filteredData.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).length} of {jobsData.length} </div>
        <Pagination>
          <PaginationContent className=" flex flex-row-reverse w-full">
            {currentPage != 1 && <PaginationItem>
              <PaginationPrevious href="#" onClick={() => handlePageChange(currentPage - 1)} />
            </PaginationItem>}
            {currentPage != totalPages && <PaginationItem>
              <PaginationNext href="#" onClick={() => handlePageChange(currentPage + 1)} />
            </PaginationItem>}
          </PaginationContent>
        </Pagination>

        <Table className="  border border-slate-200 rounded-lg shadow-md">
          <TableHeader >
            <TableRow className="hover:bg-slate-800 bg-slate-800 rounded-full text-white ">
              <TableCell className="border border-slate-400">Job Id</TableCell>
              <TableCell className="border border-slate-400">Name</TableCell>
              <TableCell className="text-center border border-slate-400">Created Date</TableCell>
              <TableCell className="text-center border border-slate-400">Execution Time</TableCell>

              <TableCell className="text-center">Status</TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredData.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((job, index) =>

              <TableRow key={index}>
                <TableCell><Link className="text-secondary font-mono underline" href={`/venues/${venue.venueId}/jobs/${job.id}`}>{job.id}</Link></TableCell>
                <TableCell>{job.name}</TableCell>
                <TableCell className="text-center">{new Date(job.created).toLocaleString()}</TableCell>
                {(job.status == RunStatus.COMPLETE || job.status == RunStatus.FAILED) && (<TableCell className="text-center">{getExecutionTime(job.created, job.updated)}</TableCell>)}
                {(job.status == RunStatus.PENDING || job.status == RunStatus.STARTED) && (<TableCell className="text-center">--</TableCell>)}


                {job.status == RunStatus.COMPLETE && <TableCell className="text-green-600 text-center">{RunStatus.COMPLETE}</TableCell>}
                {job.status == RunStatus.FAILED && <TableCell className="text-red-600 text-center">{RunStatus.FAILED}</TableCell>}
                {job.status == RunStatus.PENDING && <TableCell className="text-blue-600 text-center">{RunStatus.PENDING}</TableCell>}
                {job.status == RunStatus.STARTED && <TableCell className="text-blue-600 text-center">{RunStatus.STARTED}</TableCell>}

              </TableRow>

            )}
          </TableBody>
        </Table>



      </div>

    </ContentLayout>
  );
}
