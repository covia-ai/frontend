"use client"

import React, { useState } from "react";
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
     console.log(pathname)
     router.push(pathname+"?search="+value);
     
  }
  return (
    <div className="flex flex-col items-center justify-center w-1/2">
        <div className="flex flex-row items-center py-2 w-full">
        
        <Input
          placeholder="Type keyword to search..."
          className="w-full pl-10"
          value={searchValue}
          onChange= {(e) => setSearchValue(e.target.value)}
        />
        <div className="flex flex-row items-center">
          <MagnifyingGlassIcon className=" relative ml-4 right-10"  onClick={() => {router.push(pathname+"?search="+searchValue)}}/>
          {searchValue && <Button  onClick={() => {clearAndSetFilter("")}}>Clear</Button>}
        </div>
       
      </div>
</div>
  );
};