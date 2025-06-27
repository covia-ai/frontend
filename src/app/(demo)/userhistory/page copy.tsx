
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

import { useState } from "react";
import { Search } from "@/components/search";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check, ChevronDown, ChevronUp, Eye, Share, X } from "lucide-react"
 
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
 
export default function OperationsPage() {
  const [isOpen1, setIsOpen1] = useState(false)
  const [isOpen2, setIsOpen2] = useState(false)
  const [isOpen3, setIsOpen3] = useState(false)  
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
         <Select>
        <SelectTrigger className="w-[180px] text-semibold">
          <SelectValue className="text-semibold" placeholder="Run Status" />
        </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="success">Successful</SelectItem>
          <SelectItem value="fail">Failed</SelectItem>
          <SelectItem value="inprogress">In progress</SelectItem>
        </SelectGroup>
      </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-[180px] text-semibold">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="apple">This week</SelectItem>
              <SelectItem value="banana">This month</SelectItem>
              <SelectItem value="blueberry">Last 90 days</SelectItem>
              <SelectItem value="grapes">This year</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        </div>
           <div className="flex flex-row space-x-16 text-slate-600 mt-8  w-full text-sm ">
                    <div></div>
                    <div className="w-1/4"> Name </div>
                    <div className="w-1/4" >Credits Used</div>
                    <div className="w-1/4">Date</div>
                    <div className="w-1/4">Duration</div> 
          </div>
      <Collapsible
              open={isOpen2}
              onOpenChange={setIsOpen2}
              className=" border border-slate-200 text-slate-800 rounded-lg w-full mt-8 p-4"
            >
              
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  {!isOpen2 && <ChevronDown className="h-4 w-4" />}
                  {isOpen2 && <ChevronUp className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
                  <div className="flex flex-row space-x-16 text-sm m-0">
                    <div></div>
                    <div className="flex flex-col justify-between w-1/4"><h1 className="text-2xl font-bold"> Random </h1>
                    <Badge className="bg-green-200 text-green-600 p-1"> <Check></Check>Run Successful</Badge>
                    </div>
                    <div className="w-1/4">30 credits</div>
                    <div className="w-1/2">Apr 14, 2025 · 12:50 PM GMT+5:30</div>
                    <div className="w-1/4"> 20s</div> 
                </div>
              <CollapsibleContent className="  border border-slate-200 rounded-lg w-full p-4 mt-8">
                  <div className=" grid grid-cols-3 space-x-8 ">
                     <Card className="h-32 text-sm bg-slate-50"> <CardContent>Credit details</CardContent></Card>
                    <Card className="h-32 text-sm bg-slate-50"> <CardContent>Inputs used in the flow</CardContent></Card>
                    <Card className="h-32  text-sm bg-slate-50"><CardContent>Outputs used in the flow</CardContent></Card>
                  </div>
                  <div className="flex flex-row space-x-8 mt-4 ">
                      <Button variant={"outline"} > <Eye></Eye> View</Button>
                      <Button variant={"outline"} > <Share></Share> Share</Button>
                  </div>
              </CollapsibleContent>
      
    </Collapsible>
      <Collapsible
              open={isOpen3}
              onOpenChange={setIsOpen3}
              className=" border border-slate-200 text-slate-800 rounded-lg w-full mt-8 p-4"
            >
              
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  {!isOpen3 && <ChevronDown className="h-4 w-4" />}
                  {isOpen3 && <ChevronUp className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
                  <div className="flex flex-row space-x-16 text-sm m-0">
                    <div></div>
                    <div className="flex flex-col justify-between w-1/4"><h1 className="text-2xl font-bold"> Multiply </h1>
                    <Badge className="bg-green-200 text-green-600 p-1"> <Check></Check>Run Successful</Badge>
                    </div>
                    <div className="w-1/4">20 credits</div>
                    <div className="w-1/2">Apr 16, 2025 · 10:30 PM GMT+5:30</div>
                    <div className="w-1/4"> 10s</div> 
                </div>
              <CollapsibleContent className="  border border-slate-200 rounded-lg w-full p-4 mt-8">
                  <div className=" grid grid-cols-3 space-x-8 ">
                     <Card className="h-32 text-sm bg-slate-50"> <CardContent>Credit details</CardContent></Card>
                    <Card className="h-32 text-sm bg-slate-50"> <CardContent>Inputs used in the flow</CardContent></Card>
                    <Card className="h-32  text-sm bg-slate-50"><CardContent>Outputs used in the flow</CardContent></Card>
                  </div>
                  <div className="flex flex-row space-x-8 mt-4 ">
                      <Button variant={"outline"} > <Eye></Eye> View</Button>
                      <Button variant={"outline"} > <Share></Share> Share</Button>
                  </div>
              </CollapsibleContent>
      
    </Collapsible>
      <Collapsible
              open={isOpen1}
              onOpenChange={setIsOpen1}
              className=" border border-slate-200 text-slate-800 rounded-lg w-full mt-8 p-4"
            >
              
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  {!isOpen1 && <ChevronDown className="h-4 w-4" />}
                  {isOpen1 && <ChevronUp className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
                  <div className="flex flex-row space-x-16 text-sm m-0">
                    <div></div>
                    <div className="flex flex-col justify-between w-1/4"><h1 className="text-2xl font-bold"> Increment </h1>
                    <Badge className="bg-red-200 text-red-800 p-1"> <X></X>Failed</Badge>
                    </div>
                    <div className="w-1/4">30 credits</div>
                    <div className="w-1/2">Apr 18, 2025 · 12:50 PM GMT+5:30</div>
                    <div className="w-1/4"> 10s</div> 
                </div>
              <CollapsibleContent className="  border border-slate-200 rounded-lg w-full p-4 mt-8">
                  <div className=" grid grid-cols-3 space-x-8 ">
                     <Card className="h-32 text-sm bg-slate-50 "> <CardContent>Credit details</CardContent></Card>
                    <Card className="h-32 text-sm bg-slate-50"> <CardContent>Inputs used in the flow</CardContent></Card>
                    <Card className="h-32  text-sm bg-slate-50"><CardContent>Outputs used in the flow</CardContent></Card>
                  </div>
                  <div className="flex flex-row space-x-8 mt-4 ">
                      <Button variant={"outline"} > <Eye></Eye> View</Button>
                      <Button variant={"outline"} > <Share></Share> Share</Button>
                  </div>
              </CollapsibleContent>
      
    </Collapsible>
   
    
    </div>
       
    </ContentLayout>
  );
}
