"use client";

import { Button } from "@/components/ui/button";
import {  useRouter, usePathname } from "next/navigation";
   
export function MenuButton(props:any) {
  const pathname = usePathname();
  const router = useRouter();
  
    return (
        <div className="w-full" key={props.index}>
          <Button  variant={
           (props.active === undefined &&
            pathname.startsWith(props.href)) ||
            props.active
            ? "secondary"
            : "ghost"
           }
            
             onClick={() => {router.push(props.href)}}
             >
            {props.label}
          </Button>
    </div>
    )
}