"use client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useRouter } from "next/navigation";

export const AIPrompt = () => {
  const router = useRouter();
  const handleSubmit = (e: any) => {
    e.preventDefault();
  };
  return (
    <div id="newsletter" className="w-full bg-red-100">
      <hr className="w-11/12 " />

      <div className="flex flex-col items-center justify-center py-24 sm:py-32 px-10 bg-white ">
        <h3 className="text-center text-4xl md:text-5xl font-bold">
          Drop a prompt and try our{" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            Operations
          </span>
        </h3>
        <p className="text-xl text-muted-foreground text-center mt-4 mb-8">
          Lorem ipsum dolor sit amet consectetur.
        </p>

        <form
          className="flex flex-col items-center justify-center w-full md:flex-row mx-auto gap-4 md:gap-2"
          onSubmit={handleSubmit}
        >
          <Input
            placeholder="Prompt to run an operation"
            className="bg-muted/50 dark:bg-muted/80 w-8/12"
            aria-label="email"
          />
          <Button variant="default" onClick={() => router.push("/operations/rand101")}>
              Run
          </Button>
        </form>
      </div>

      <hr className="w-11/12 mx-auto" />
    </div>
  );
};
