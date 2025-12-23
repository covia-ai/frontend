"use client"

import React, { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
export const Search: React.FC = (   ) => {
  const [searchValue, setSearchValue] = useState("")
  const pathname = usePathname()
  const router = useRouter()
  function clearAndSetFilter(value:string)   {
     setSearchValue(value);
     window.location.href = pathname;
     
  }

  return (
    <div className="flex flex-col items-center justify-center w-1/2 mt-4">
        <div className="flex flex-row items-center py-2 w-full ">
        
        <Input
          placeholder="Type keyword to search..."
          className="w-full pl-10 bg-card text-card-foreground placeholder:text-gray-400"
          value={searchValue}
          onChange= {(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
          if (e.key === 'Enter') {
            window.location.href = pathname + "?search=" + searchValue;
          }
         }}
        />
        <div className="flex flex-row items-center">
          <MagnifyingGlassIcon className=" relative ml-4 right-10 "   onClick={() => {
            window.location.href = pathname+"?search="+searchValue}}/>
          <Button  aria-label="Clear search" role="button" onClick={() => {clearAndSetFilter("")}}>Clear</Button>
        </div>
       
      </div>
   </div>
  );
};