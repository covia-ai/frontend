import { Button } from "./ui/button";
import { buttonVariants } from "./ui/button";
import Image from "next/image";
import Link from "next/link";

export const Hero = () => {
  return (
    <section className=" grid lg:grid-cols-2 place-items-center py-20 md:py-32 gap-10 px-10 bg-slate-100">
      <div className="text-center lg:text-start space-y-6">
        <main className="text-5xl md:text-6xl font-bold">
          <h1 className="inline">
            <span className="inline bg-gradient-to-r from-[#F596D3]  to-[#D247BF] text-transparent bg-clip-text">
              Covia.
            </span>{" "}
             The Open Standard for AI 
          </h1>{" "}
          <h2 className="inline">
            <span className="inline bg-gradient-to-r from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7] text-transparent bg-clip-text">
            Orchestration.
            </span>{" "}
          </h2>
        </main>

        <p className="text-xl text-muted-foreground md:w-10/12 mx-auto lg:mx-0">
        Covia is a federated AI orchestration protocol powering the AI-driven economy.
        </p>

        <div className="space-y-4 md:space-y-0 md:space-x-4">
          <Button className="w-full md:w-1/3"><Link href="/operations">Get Started</Link></Button>

          <Link
            href="#"
            target="_blank"
            className={`w-full md:w-1/3 ${buttonVariants({
              variant: "outline",
            })}`}
          >
            Read the Docs
            
          </Link>
        </div>
      </div>

      {/* Hero cards sections */}
      <div className="z-10">
          <Image src="/placeholder1.png" width="300" height="300" alt="workfow"/>
      </div>

      {/* Shadow effect */}
      <div className="shadow"></div>
    </section>
  );
};
