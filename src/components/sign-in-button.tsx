"use client";

import { BsGithub, BsGoogle } from "react-icons/bs"
import { Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { gtmEvent } from "@/lib/utils";
import { generateKeyPair, privateKeyToHex, KeyPairAuth } from "@covia/covia-sdk";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenue } from "@/hooks/use-venue";
import { useVenues } from "@/hooks/use-venues";
import { useRouter } from "next/navigation";

export const SignInButton = () => {
    const loginWithKeypair = useAuthStore((x) => x.loginWithKeypair);
    const getDeviceKeyHex = useAuthStore((x) => x.getDeviceKeyHex);
    const setDeviceKeyHex = useAuthStore((x) => x.setDeviceKeyHex);
    const currentVenue = useVenue((x) => x.currentVenue);
    const venues = useVenues((x) => x.venues);
    const router = useRouter();

    const handleLogin = (providerName: string) => {
      const venueUrl = currentVenue?.baseUrl || venues[0]?.baseUrl;
      if (!venueUrl) {
        console.error("No venue available for OAuth login");
        return;
      }
      gtmEvent.buttonClick('Sign Up', providerName);
      const redirectUri = `${window.location.origin}/auth/callback`;
      window.location.href = `${venueUrl}/auth/${providerName}?redirect_uri=${encodeURIComponent(redirectUri)}`;
    };

    const handleKeypairLogin = () => {
      gtmEvent.buttonClick('Sign Up', 'keypair');
      let hex = getDeviceKeyHex();
      if (!hex) {
        const { privateKey } = generateKeyPair();
        hex = privateKeyToHex(privateKey);
        setDeviceKeyHex(hex);
      }
      const auth = KeyPairAuth.fromHex(hex);
      loginWithKeypair(hex, auth.getDID());
      router.push("/operations");
    };

    return (
      <div className="flex flex-col items-center justify-center dark:bg-background">
        <Button aria-label="signin" role="button" variant={"outline"} className = "bg-black text-white my-2 w-64" onClick={() => handleLogin("github")} >
            <BsGithub />Sign in with Github
       </Button>
        <Button aria-label="signin" role="button"  variant={"outline"} className = "bg-black text-white my-2 w-64" onClick={() => handleLogin("google")} >
            <BsGoogle />Sign in with Google
        </Button>
        <div className="flex items-center my-3 w-64">
          <div className="flex-grow border-t border-muted-foreground/30"></div>
          <span className="px-3 text-sm text-muted-foreground">or</span>
          <div className="flex-grow border-t border-muted-foreground/30"></div>
        </div>
        <Button aria-label="keypair-signin" role="button" variant={"outline"} className="my-2 w-64" onClick={handleKeypairLogin}>
            <Key className="mr-1 h-4 w-4" />Continue with Device Key
        </Button>
     </div>
    )
};
