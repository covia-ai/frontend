"use client";

import { BsGithub, BsGoogle } from "react-icons/bs"
import { Button } from "@/components/ui/button"
import { login } from "@/lib/actions/auth"
import { gtmEvent } from "@/lib/utils";

export const SignInButton = () => {
    const loginAndLogTheEvent = async (providerName:string) => {
      gtmEvent.buttonClick('Sign Up', providerName)
      login(providerName)
    };

    return (    
      <div className="flex flex-col items-center justify-center dark:bg-background">
        <Button aria-label="signin" role="button" variant={"outline"} className = "bg-black text-white my-2 w-64" onClick={() => loginAndLogTheEvent("github")} > 
            <BsGithub />Sign in with Github
       </Button>
        <Button aria-label="signin" role="button"  variant={"outline"} className = "bg-black text-white my-2 w-64" onClick={() => loginAndLogTheEvent("google")} > 
            <BsGoogle   />Sign in with Google
        </Button>
     </div>
  
    )
  
 
};
