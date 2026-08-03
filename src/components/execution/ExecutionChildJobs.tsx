import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";

type ChildJob = {
  id?: string;
  status?: string;
};

export function ExecutionChildJobs({
  steps,
  venueId,
}: {
  steps: unknown;
  venueId: string;
}) {
  const childJobs = Array.isArray(steps) ? (steps as ChildJob[]) : [];
  return (
    <Table className="border border-border rounded-md py-2">
      <TableHeader>
        <TableRow className="bg-secondary-light text-secondary-foreground">
          <TableCell>#</TableCell>
          <TableCell>Job Id</TableCell>
          <TableCell>Status</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {childJobs.map((step, index) => {
          const id = step.id ?? "";
          return (
            <TableRow key={id || index}>
              <TableCell className="text-muted-foreground">{index}</TableCell>
              <TableCell className="text-secondary font-mono underline">
                <Link
                  href={`/venues/${encodeURIComponent(venueId)}/jobs/${id}`}
                >
                  {id}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={step.status ?? "UNKNOWN"}
                  kind="job"
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
