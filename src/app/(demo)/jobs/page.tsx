
"use client";

import Link from "next/link";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";

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
import { Job, JobMetadata, RunStatus, Venue } from "@/lib/covia";


import { getExecutionTime } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { PaginationHeader } from "@/components/PaginationHeader";

export default function OperationsPage() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [jobsData, setJobsData] = useState<JobMetadata[]>([]);
  const [filteredData, setFilteredData] = useState<JobMetadata[]>([]);
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const nextPage = (page: number) => {
    setCurrentPage(page)
  }
  const prevPage = (page: number) => {
    setCurrentPage(page)
  }
  function isInRange(date: string) {
    if (dateFilter == "today") {
      const x = new Date().getDay();
      const y = new Date(date).getDay();
      if (x == y) return true;

      return false;

    }
    return true;
  }
 const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  if (!venueObj) return null;
  const venue = new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId})

  useEffect(() => {
    venue.getJobs().then((jobs) => {
      setTotalItems(jobs.length)
      setTotalPages(Math.ceil(jobs.length / itemsPerPage))
      jobs.forEach((jobId) => {
        venue.getJob(jobId).then((job:Job) => {
          setJobsData(prevArray => [...prevArray, job.metadata]);
          setFilteredData(prevArray => [...prevArray, job.metadata])
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

  const encodedPath = (jobId:string) => {
        return "/venues/"+encodeURIComponent(venue.venueId)+"/jobs/"+jobId;
        
    };
    const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
     second:'2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC', // Key setting for UTC time
   });
  return (
    <ContentLayout title="Jobs">
      <SmartBreadcrumb venueName={venue.name}/>
      <div className="flex flex-col items-center justify-center  mt-2 bg-background">
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
        <div className="text-card-foreground text-xs flex flex-row my-2">Page {currentPage} : Showing {filteredData.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).length} of {jobsData.length} </div>
        <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>
        <Table className="  border border-slate-200 rounded-lg shadow-md">
          <TableHeader >
            <TableRow className="bg-secondary hover:bg-secondary rounded-full text-white ">
              <TableCell className="border border-slate-400">Job Id</TableCell>
              <TableCell className="border border-slate-400">Name</TableCell>
              <TableCell className="text-center border border-slate-400">Created Date</TableCell>
              <TableCell className="text-center border border-slate-400">Execution Time</TableCell>

              <TableCell className="text-center">Status</TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredData.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((job, index) =>

              isInRange(job.created) && 
              <TableRow key={index}>
                <TableCell><Link className="text-foreground font-mono underline" href={encodedPath(job.id)}>{job.id}</Link></TableCell>
                <TableCell>{job.name}</TableCell>
                <TableCell className="text-center">{formatter.format(new Date(job.created)).replace(', ', 'T') + 'Z'}</TableCell>
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
        <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>
      </div>
    </ContentLayout>
  );
}
