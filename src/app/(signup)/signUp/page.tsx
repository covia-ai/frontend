"use server"
import { auth } from "@/auth"
import { SignInButton } from "@/components/sign-in-button"
import {
  Avatar,
  AvatarImage,
} from "@/components/ui/avatar"

export default async function  SignUp() {


  const session = await auth();
  if (!session?.user) {
    return (  
      <div className=" flex lg:flex-row justify-center items-center  min-h-screen">  
        <div className=" flex flex-col justify-center items-center px-10 lg:w-1/2 bg-white">
          
            <h3 className="text-center text-4xl md:text-5xl font-bold ">
              {}
                Log In {" "}
              
              </h3>
              <p className="text-xl text-muted-foreground text-center mt-8 mb-8">
                Welcome back to Covia app! Log in with Google or Github to continue to your account.
              </p>
              
              <SignInButton/>
              <div className="flex items-center justify-center space-x-2 space-y-2 text-xs text-slate-600">
                By Signing up you are agreeing to Covia terms and conditions 
              </div>
        
        </div>
        <div className="hidden lg:block  w-1/2 flex flex-col items-center justify-center bg-slate-200 h-screen">   
        </div>
      </div>
    )
 }
 else {
    return (  
        <div className=" flex lg:flex-row justify-center items-center  min-h-screen">  
        <div className=" flex flex-col justify-center items-center px-10 lg:w-1/2 bg-white">
          
            <h2 className="text-center text-xl md:text-2xl  ">
              {}
                You are logged in as  {" "}
                 <div>{session?.user.email}</div>
                 <div className="mx-auto">
                     <>
                            {session?.user.image && <Avatar>
                                 <AvatarImage src={session?.user.image} alt="avatar" className="hover:bg-slate-400"/>
                                </Avatar>
                            }
                            {!session?.user.image && <Avatar>
                                 <AvatarImage src="./profile.png" alt="avatar" className="hover:bg-slate-400"/>
                                </Avatar>
                            }
                           </>                  
                  </div>
                 <div>{session?.user.name}</div>
              </h2>
              
        
        </div>
        <div className="hidden lg:block  w-1/2 flex flex-col items-center justify-center bg-slate-200 h-screen">   
        </div>
        </div>
  )
 }
}