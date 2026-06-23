import Link from "next/link";
import { ContentLayout } from "@/components/admin-panel/content-layout";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { Job, JobMetadata, RunStatus, Venue } from "@covia/covia-sdk";
import { createAuthProvider } from "@/lib/auth-provider";
import { colourForStatus, getExecutionTime } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { PaginationHeader } from "@/components/PaginationHeader";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
import { Activity } from "lucide-react";
import { TopBar } from "./admin-panel/TopBar";

const ACTIVE_STATUSES = new Set([RunStatus.PENDING, RunStatus.STARTED, RunStatus.PAUSED]);

export function JobList() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [jobsData, setJobsData] = useState<JobMetadata[]>([]);
  const [filteredData, setFilteredData] = useState<JobMetadata[]>([]);
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const { venues } = useVenues();
  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
  const authMap = useAuthStore((x) => x.authMap);
  const prevVenueId = useRef<string | undefined>(undefined);

  const nextPage = (page: number) => { setCurrentPage(page) }
  const prevPage = (page: number) => { setCurrentPage(page) }

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  function isInRange(date: string) {
    if (dateFilter == "today") {
      return new Date().getDay() === new Date(date).getDay();
    }
    return true;
  }

  const fetchJobs = useCallback(() => {
    if (!venueObj) return;
    const authData = getAuthForVenue(venueObj.venueId);
    const venue = new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId, auth: createAuthProvider(authData)});

    venue.jobs.list().then((jobs) => {
      const newJobs: JobMetadata[] = [];
      const promises = jobs.map((jobId) =>
        venue.jobs.get(jobId).then((job: Job) => { newJobs.push(job.metadata); })
      );
      Promise.all(promises).then(() => {
        newJobs.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        setJobsData(newJobs);
        setFilteredData(statusFilter === 'All' ? newJobs : newJobs.filter(j => j.status === statusFilter));
      });
    });
  }, [venueObj, authMap, getAuthForVenue, statusFilter]);

  useEffect(() => {
    if (!venueObj) return;

    if (prevVenueId.current !== venueObj.venueId) {
      setStatusFilter("All");
      setJobsData([]);
      setFilteredData([]);
      prevVenueId.current = venueObj.venueId;
    }

    fetchJobs();
  }, [venueObj, authMap, getAuthForVenue]);

  useEffect(() => {
    const hasActiveJobs = jobsData.some(j => ACTIVE_STATUSES.has(j.status as RunStatus));
    if (!hasActiveJobs || !venueObj) return;
    const id = setInterval(fetchJobs, 5000);
    return () => clearInterval(id);
  }, [jobsData, fetchJobs, venueObj]);

  useEffect(() => {
    const filtered = statusFilter === 'All'
      ? jobsData
      : jobsData.filter(j => j.status === statusFilter);
    filtered.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    setFilteredData(filtered);
    setCurrentPage(1);
  }, [statusFilter, jobsData]);

  if(venues.length == 0)
    return (
      <ContentLayout>
      <TopBar />
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
  <div className="flex flex-col items-center justify-center w-full h-100 space-y-2">
          <Activity size={64} className="text-primary"></Activity>
          <div className="text-primary text-lg">Get Started with Operations</div>
          <div className="text-card-foreground text-sm">Connect to a venue to get started and see the available operations</div>
      </div>
    </div>
      </ContentLayout>
  )

    const encodedPath = (jobId:string) => {
        return "/venues/"+encodeURIComponent(venueObj?.venueId || "")+"/jobs/"+jobId;
        
    };

    const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
   });
  return (
    <ContentLayout >
      <TopBar venueName={venueObj?.metadata.name}/>
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
        <Table className="  border border-border rounded-lg shadow-md">
          <TableHeader >
            <TableRow className="bg-secondary hover:bg-secondary rounded-full text-secondary-foreground ">
              <TableCell className="border border-border">Job Id</TableCell>
              <TableCell className="border border-border">Name</TableCell>
              <TableCell className="text-center border border-border">Created Date</TableCell>
              <TableCell className="text-center border border-border">Execution Time</TableCell>

              <TableCell className="text-center border border-border">Status</TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredData.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((job, index) =>

              isInRange(job.created) && 
              <TableRow key={index}>
                <TableCell><Link className="text-foreground font-mono underline" href={encodedPath(job.id)}>{job.id}</Link></TableCell>
                <TableCell>{job.name}</TableCell>
                <TableCell>{formatter.format(new Date(job.created))}</TableCell>
                {(job.status == RunStatus.COMPLETE || job.status == RunStatus.FAILED) ? 
                 (<TableCell >{getExecutionTime(job.created, job.updated)}</TableCell>) : 
                 (<TableCell >--</TableCell>)
                 }

                <TableCell className={colourForStatus(job.status)}>{job.status}</TableCell>
              </TableRow>
              
            )}
          </TableBody>
        </Table>
        <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>
      </div>
    </ContentLayout>
);
}
