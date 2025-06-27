"use client";

import { BsGithub, BsGoogle } from "react-icons/bs"
import { Button } from "@/components/ui/button"
import { login } from "@/lib/actions/auth"

export const SignInButton = () => {
    return (    
      <div className="flex flex-col items-center justify-center">
        <Button variant={"outline"} className = "bg-black text-white my-2 w-64" onClick={() => login("github")} > 
            <BsGithub  className="h-32" />Sign in with Github
       </Button>
        <Button variant={"outline"} className = "bg-black text-white my-2 w-64" onClick={() => login("google")} > 
            <BsGoogle  className="h-32" />Sign in with Google
        </Button>
     </div>
  
    )
  
 
};
