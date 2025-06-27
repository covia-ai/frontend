
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
import { Check, Timer, X } from "lucide-react"

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { UserHistory } from "@/config/types";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
 
export default function OperationsPage() {
 const [userData, setUserData]=  useState<UserHistory[]>([]);
 const [statusFilter, setStatusFilter] = useState("All");
 const [dateFilter, setDateFilter] = useState("All");
 const [isLoading, setLoading] = useState(true);

  const { data: session } = useSession();
  if (!session?.user) {
      redirect("/signUp");
 }
 function isInRange(date:string) {
  console.log(date)
  if(dateFilter == "today") {
     const x = new Date();
     const y = new Date(date);
     console.log(x)
     console.log(y)
     console.log(x == y)
    if(x == y) return true;
  
    return false;
  
   }
  }
 
       useEffect(() => {
         async function fetchData() {
           try {
             const response = await fetch('/api/runs');
             if (!response.ok) {
               throw new Error(`HTTP error! Status: ${response.status}`);
             }
             const result = await response.json();
             console.log(result)
             setUserData(result);
             setLoading(false);
           } catch (err) {
           } finally {
           }
         }
         fetchData();
       }, []);

 
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
          <SelectItem value="Successful">Successful</SelectItem>
          <SelectItem value="Failed">Failed</SelectItem>
          <SelectItem value="In Progress">In Progress</SelectItem>
        </SelectGroup>
      </SelectContent>
        </Select>
        <Select onValueChange={value => setDateFilter(value)} defaultValue="All">
          <SelectTrigger className="w-[180px] text-semibold">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
               <SelectItem value="All">All</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="thisweek">This week</SelectItem>
             
            </SelectGroup>
          </SelectContent>
        </Select>
        </div>
           
         {!isLoading &&  <Table className=" mt-8">
              <TableHeader >
                <TableRow className="hover:bg-slate-800 bg-slate-800 rounded-full text-white">
                  <TableCell className="text-center">Operation Name</TableCell>
                  <TableCell className="text-center">Output Asset</TableCell>
                  <TableCell className="text-center">Execution Date</TableCell>
                  <TableCell className="text-center">Run Status</TableCell>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                  { userData && userData.map((entry: UserHistory) => 
                  ( 
                   (statusFilter == entry.status || statusFilter == "All"  ) && ( dateFilter == "All" || isInRange(entry.executionDate)) && (<TableRow >
                  <TableCell className="text-center">
                    <Link href={`/runs/${entry.id}`} className="hover:underline text-sm hover:text-pink-400">{entry.operationId}</Link></TableCell>
                  <TableCell className="text-center">
                    
                     {entry.output && entry.output.map((asset) => ( 
                      <div><Link href={`/myassets/${asset.id}`} className="hover:underline text-sm hover:text-pink-400">{asset.id}</Link></div>
                     ))}
                  </TableCell>
                  <TableCell className="text-center">{entry.executionDate}</TableCell>
                  {entry.status == "Successful" && <TableCell className="text-center"><Badge className="bg-green-200 text-green-600 p-1"> <Check></Check>Run Successful</Badge></TableCell>}
                  {entry.status == "Failed" && <TableCell className="text-center"><Badge className="bg-red-200 text-red-600 p-1"> <X></X>Failed</Badge></TableCell>}
                  {entry.status == "In Progress" && <TableCell className="text-center"><Badge className="bg-blue-200 text-blue-600 p-1"> <Timer></Timer>In Progress</Badge></TableCell>}

                 </TableRow>)
                
                  ))
                  
                  }
                 
                  
              </TableBody>
            </Table>
           }
           {
            isLoading && <Skeleton className="h-1/2 w-11/12 rounded-xl" ></Skeleton>
           }
    
    </div>
       
    </ContentLayout>
  );
}
