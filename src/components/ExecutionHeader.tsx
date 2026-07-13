'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IdAndLink } from "./IdandLink";
import { JobMetadata }from "@covia/covia-sdk";

interface ExecutionHeaderProps {
  jobData?: JobMetadata;
  venueId?: string;
}

export const ExecutionHeader = ({ jobData, venueId }: ExecutionHeaderProps) => {
  const pathname = usePathname();
  return (
    <div className="flex flex-col w-full items-center justify-center mb-2 mt-2 border border-slate-200 rounded-md p-4 bg-card">
      <h1 className="text-xl text-thin">
        <Link href={pathname} className="hover:text-pink-400 hover:underline">
          {jobData?.name}
        </Link>
      </h1>

     <IdAndLink type="Job" venueId={venueId} id={jobData?.id}></IdAndLink>
    </div>
  );
};