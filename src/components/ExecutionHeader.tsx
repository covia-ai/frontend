'use client'

import Link from "next/link";
import { IdAndLink } from "./IdandLink";
import { Job,  JobMetadata } from "@covia/covia-sdk";

interface ExecutionHeaderProps {
  jobData: JobMetadata;
}

export const ExecutionHeader = ({ jobData }: ExecutionHeaderProps) => {
  return (
    <div className="flex flex-col w-full items-center justify-center mb-2 mt-2 border border-slate-200 rounded-md p-4 bg-card">
      <h1 className="text-xl text-thin">
        <Link href={window.location.href} className="hover:text-pink-400 hover:underline">
          {jobData?.name}
        </Link>
      </h1>

     <IdAndLink type="Job" url={window.location.href} id={jobData?.id}></IdAndLink>
    </div>
  );
}; 