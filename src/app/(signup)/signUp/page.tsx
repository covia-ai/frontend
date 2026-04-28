"use client"
import { SignInButton } from "@/components/sign-in-button"
import { useAuthStore } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

export default function SignUp() {
  const auth = useAuthStore((x) => x.auth);
  const router = useRouter();

  if (!auth) {
    return (
      <div className=" flex lg:flex-row justify-center items-center  min-h-screen bg-background :text-foreground">
        <div className=" flex flex-col justify-center items-center px-10 lg:w-1/2">

            <h3 className="text-center text-4xl md:text-5xl font-thin ">
              {}
                Log In {" "}

              </h3>
              <p className="text-xl text-muted-foreground text-center mt-8 mb-8">
                Welcome back to Covia app! Log in with Google or Github, or continue with a device key.
              </p>

              <SignInButton/>
              <div className="flex items-center justify-center space-x-2 space-y-2 text-xs text-muted-foreground">
                By Signing up you are agreeing to Covia terms and conditions
              </div>

        </div>
        <div className="hidden lg:block  w-1/2 flex flex-col items-center justify-center bg-muted h-screen">
        </div>
      </div>
    )
 }
 else {
    return (
        <div className=" flex lg:flex-row justify-center items-center  min-h-screen bg-background text-foreground">
        <div className=" flex flex-col justify-center items-center px-10 lg:w-1/2">

            <h2 className="text-center text-xl font-thin md:text-2xl  ">
              {}
                You are logged in as  {" "}
                 <div className="truncate max-w-[300px]">{auth.did}</div>
            </h2>
            <Badge variant="outline" className="mt-4">
              {auth.type === "keypair" ? "Device Key" : "OAuth"}
            </Badge>

        </div>
        <div className="hidden lg:block  w-1/2 flex flex-col items-center justify-center bg-muted h-screen">
        </div>
        </div>
  )
 }
}
