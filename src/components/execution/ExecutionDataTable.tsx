import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatLabel } from "@/lib/utils";

type FieldSchema = {
  type?: string;
  secret?: boolean;
};

type ValueSchema = {
  properties?: Record<string, FieldSchema>;
};

function SimpleValueTable({ value }: { value: unknown }) {
  return (
    <Table className="border border-border rounded-md py-2">
      <TableHeader>
        <TableRow className="bg-secondary-light text-secondary-foreground">
          <TableCell>Value</TableCell>
          <TableCell>Type</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="max-w-xs break-words whitespace-pre-wrap text-card-foreground">
            {typeof value === "object"
              ? JSON.stringify(value)
              : String(value)}
          </TableCell>
          <TableCell className="text-card-foreground">
            {typeof value}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export function ExecutionDataTable({
  value,
  schema,
  direction,
}: {
  value: unknown;
  schema?: ValueSchema;
  direction: "input" | "output";
}) {
  if (value === undefined || value === null) return <div>No Data</div>;
  if (typeof value !== "object") return <SimpleValueTable value={value} />;

  if (Array.isArray(value)) {
    return (
      <Table className="border border-border rounded-md py-2">
        <TableHeader>
          <TableRow className="bg-secondary-light text-secondary-foreground">
            <TableCell>Index</TableCell>
            <TableCell>Value</TableCell>
            <TableCell>Type</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {value.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="text-card-foreground">{index}</TableCell>
              <TableCell className="max-w-xs break-words whitespace-pre-wrap text-card-foreground">
                {typeof item === "object"
                  ? JSON.stringify(item)
                  : String(item)}
              </TableCell>
              <TableCell className="text-card-foreground">
                {typeof item}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) return <SimpleValueTable value={value} />;

  return (
    <Table className="border border-border rounded-md py-2">
      <TableHeader>
        <TableRow className="bg-secondary-light text-secondary-foreground">
          <TableCell>Name</TableCell>
          <TableCell>Value</TableCell>
          <TableCell>Type</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((key) => {
          const fieldSchema = schema?.properties?.[key];
          const fieldType = fieldSchema?.type;
          const fieldValue = record[key];
          return (
            <TableRow key={key}>
              <TableCell
                className={`text-md ${
                  direction === "input"
                    ? "bg-input-color"
                    : "bg-output-color"
                } text-io-foreground`}
              >
                {formatLabel(key)}
              </TableCell>
              <TableCell className="max-w-xs break-words whitespace-pre-wrap text-card-foreground">
                {fieldSchema?.secret
                  ? <span className="italic">Secret Hidden</span>
                  : fieldType === "string"
                    ? String(fieldValue ?? "")
                    : JSON.stringify(fieldValue)}
              </TableCell>
              <TableCell className="text-card-foreground">
                {fieldType ?? (
                  <span className="flex flex-row items-center space-x-1">
                    <span>{typeof fieldValue}</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <QuestionMarkCircledIcon />
                      </TooltipTrigger>
                      <TooltipContent>
                        The schema does not specify a type; this value was
                        interpreted as {typeof fieldValue}.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
