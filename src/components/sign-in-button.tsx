"use client";

import { BsGithub, BsGoogle } from "react-icons/bs"
import { Button } from "@/components/ui/button"
import { gtmEvent } from "@/lib/utils";

const VENUE_URL = process.env.NEXT_PUBLIC_DEFAULT_VENUE_URL || "";

export const SignInButton = () => {
    const handleLogin = (providerName: string) => {
      gtmEvent.buttonClick('Sign Up', providerName);
      const redirectUri = `${window.location.origin}/auth/callback`;
      window.location.href = `${VENUE_URL}/auth/${providerName}?redirect_uri=${encodeURIComponent(redirectUri)}`;
    };

    return (
      <div className="flex flex-col items-center justify-center dark:bg-background">
        <Button aria-label="signin" role="button" variant={"outline"} className = "bg-black text-white my-2 w-64" onClick={() => handleLogin("github")} >
            <BsGithub />Sign in with Github
       </Button>
        <Button aria-label="signin" role="button"  variant={"outline"} className = "bg-black text-white my-2 w-64" onClick={() => handleLogin("google")} >
            <BsGoogle   />Sign in with Google
        </Button>
     </div>

    )


};
