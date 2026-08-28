"use client";

import { Fragment } from "react";
import dynamic from "next/dynamic";
import { FileJson, Lock } from "lucide-react";
import type { Venue } from "@covia/covia-sdk";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { SchedulePickerDialog } from "@/components/SchedulePickerDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { OperationInputController } from "@/hooks/use-operation-input";
import {
  parseOperationInput,
  printOperationInput,
  TOP_LEVEL_INPUT_KEY,
  type OperationInputProperty,
  type OperationInputSchema,
} from "@/lib/operation-input";
import { cn, formatLabel } from "@/lib/utils";
import { JSON_EDITOR_DIALOG_CLASS, JSON_EDITOR_MAX_WIDTH } from "@/lib/dialog-sizes";

const AssetLookup = dynamic(
  () =>
    import("@/components/AssetLookup").then(
      (module) => module.AssetLookup,
    ),
  { ssr: false },
);

const ThemedJsonEditor = dynamic(
  () => import("@/components/ThemedJsonEditor").then((module) => module.ThemedJsonEditor),
  { ssr: false },
);

const INPUT_TYPES = [
  "string",
  "number",
  "json",
  "object",
  "any",
  "asset",
  "array",
];

// Passed only when the resolved asset/venue are known — lets
// OperationActions render "Run on a schedule" next to Run/Reset (#230).
// Absent for callers that haven't resolved an operation reference yet.
type ScheduleTarget = {
  venue: Venue;
  operation: string;
  input: unknown;
};

type OperationInputFormProps = {
  schema?: OperationInputSchema;
  outputSchema?: unknown;
  controller: OperationInputController;
  errorMessage: string;
  loading: boolean;
  confirmationRequired: boolean;
  isAuthenticated: boolean;
  onRun: () => void;
  scheduleTarget?: ScheduleTarget;
};

// Bottom-of-card link to the raw input/output schema — kept next to the
// actions rather than above the form so it reads as "more about this
// operation" instead of competing with Run/Reset for top-of-card attention.
function ViewSchemaButton({
  inputSchema,
  outputSchema,
}: {
  inputSchema?: OperationInputSchema;
  outputSchema?: unknown;
}) {
  if (!inputSchema && !outputSchema) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
          <FileJson size={14} />
          View Schema
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(JSON_EDITOR_DIALOG_CLASS, "content-start overflow-y-auto")}>
        <DialogTitle>Operation Schema</DialogTitle>
        <ThemedJsonEditor
          data={{ input: inputSchema, output: outputSchema }}
          rootName="schema"
          maxWidth={JSON_EDITOR_MAX_WIDTH}
        />
      </DialogContent>
    </Dialog>
  );
}

function OperationActions({
  loading,
  confirmationRequired,
  isAuthenticated,
  onRun,
  onReset,
  scheduleTarget,
}: {
  loading: boolean;
  confirmationRequired: boolean;
  isAuthenticated: boolean;
  onRun: () => void;
  onReset: () => void;
  scheduleTarget?: ScheduleTarget;
}) {
  if (loading) {
    return (
      <Button aria-label="invoke operation" className="w-32" disabled>
        Please wait ...
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button variant="outline" disabled className="gap-2 text-muted-foreground">
        <Lock size={14} />
        Sign in to run operations
      </Button>
    );
  }

  return (
    <>
      <Button
        aria-label="invoke operation"
        type="button"
        className="w-32"
        onClick={onRun}
      >
        {confirmationRequired ? "Run anyway?" : "Run"}
      </Button>
      <Button
        type="button"
        aria-label="reset"
        className="w-32"
        onClick={onReset}
      >
        Reset
      </Button>
      {scheduleTarget && (
        <SchedulePickerDialog
          venue={scheduleTarget.venue}
          operation={scheduleTarget.operation}
          input={scheduleTarget.input}
        />
      )}
    </>
  );
}

function InputEditor({
  fieldKey,
  schema,
  controller,
}: {
  fieldKey: string;
  schema: OperationInputProperty;
  controller: OperationInputController;
}) {
  const defaultValue = schema.default ?? "";
  const example = Array.isArray(schema.examples)
    ? schema.examples[0]
    : schema.examples;
  const type = controller.typeMap[fieldKey] || schema.type || "string";
  const isSecret = schema.secret === true;
  const currentRawValue =
    controller.rawInput[fieldKey] !== undefined
      ? controller.rawInput[fieldKey]
      : printOperationInput(
          fieldKey === TOP_LEVEL_INPUT_KEY
            ? controller.input
            : defaultValue,
          type,
        );

  const updateValue = (rawValue: string) => {
    controller.setRawValue(fieldKey, rawValue);
    try {
      controller.setValue(fieldKey, parseOperationInput(rawValue, type));
    } catch {
      // Preserve invalid raw JSON so the user can finish editing it.
    }
  };

  const commonProps = {
    className: "flex-1 placeholder:text-muted-foreground min-w-64 max-w-112",
    value: currentRawValue,
    placeholder: example === undefined ? "" : `e.g. ${String(example)}`,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => updateValue(event.target.value),
  };

  const typeSelector = (
    <Select
      value={type}
      onValueChange={(nextType) => controller.setType(fieldKey, nextType)}
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {INPUT_TYPES.map((inputType) => (
          <SelectItem key={inputType} value={inputType}>
            {inputType}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (type === "asset") {
    return (
      <div className="flex flex-row space-x-2 items-center">
        <Input {...commonProps} type={isSecret ? "password" : "text"} />
        <AssetLookup sendAssetIdBackToForm={updateValue} />
        {typeSelector}
      </div>
    );
  }

  if (type === "json" || type === "object" || type === "any" || type === "array") {
    return (
      <div className="flex flex-row space-x-2 items-center">
        <Textarea
          {...commonProps}
          rows={5}
          className={`flex-1 placeholder:text-muted-foreground ${isSecret ? "font-mono" : ""}`}
          style={
            isSecret
              ? { fontFamily: "monospace", letterSpacing: "0.1em" }
              : undefined
          }
        />
        {typeSelector}
      </div>
    );
  }

  return (
    <div className="flex flex-row space-x-2 items-center">
      <Input
        {...commonProps}
        type={isSecret ? "password" : type === "number" ? "number" : "text"}
      />
      {typeSelector}
    </div>
  );
}

export function OperationInputForm({
  schema,
  outputSchema,
  controller,
  errorMessage,
  loading,
  confirmationRequired,
  isAuthenticated,
  onRun,
  scheduleTarget,
}: OperationInputFormProps) {
  const properties = schema?.properties;
  const requiredKeys = schema?.required ?? [];

  if (!properties) {
    return (
      <div className="w-11/12 my-2">
        <div className="grid grid-cols-2 md:grid-cols-[min-content_1fr_1fr] gap-4 items-center">
          <Label className="whitespace-nowrap">(Input)</Label>
          <InputEditor
            fieldKey={TOP_LEVEL_INPUT_KEY}
            schema={{
              ...schema,
              type: schema?.type ?? "any",
              description: schema?.description ?? "Provide input for the operation",
              default: schema?.default ?? "",
            }}
            controller={controller}
          />
          <div className="text-sm text-muted-foreground">
            Provide input for the operation
          </div>
        </div>
        {errorMessage && <ErrorDisplay error={errorMessage} className="mb-4" />}
        <div className="flex flex-row space-x-2 items-center justify-center py-2">
          <OperationActions
            loading={loading}
            confirmationRequired={confirmationRequired}
            isAuthenticated={isAuthenticated}
            onRun={onRun}
            onReset={controller.reset}
            scheduleTarget={scheduleTarget}
          />
        </div>
        <div className="flex justify-end">
          <ViewSchemaButton inputSchema={schema} outputSchema={outputSchema} />
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-background border-muted w-full my-2 rounded-md">
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-[min-content_1fr_1fr] md:gap-4 py-2">
          {Object.entries(properties).map(([key, property]) => (
            <Fragment key={key}>
              <div className="flex flex-row items-center min-w-0 my-2">
                <Label className="whitespace-nowrap">{formatLabel(key)}</Label>
                {requiredKeys.includes(key) && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </div>
              <div className="w-full">
                <InputEditor
                  fieldKey={key}
                  schema={property}
                  controller={controller}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {property.description ?? ""}
              </div>
            </Fragment>
          ))}
        </div>

        {errorMessage && <ErrorDisplay error={errorMessage} className="mb-4" />}
        <div className="flex flex-row space-x-2 items-center justify-center py-2">
          <OperationActions
            loading={loading}
            confirmationRequired={confirmationRequired}
            isAuthenticated={isAuthenticated}
            onRun={onRun}
            onReset={controller.reset}
            scheduleTarget={scheduleTarget}
          />
        </div>
        <div className="flex justify-end">
          <ViewSchemaButton inputSchema={schema} outputSchema={outputSchema} />
        </div>
      </CardContent>
    </Card>
  );
}
