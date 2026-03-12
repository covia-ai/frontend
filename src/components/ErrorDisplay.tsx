'use client'

import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { friendlyError } from "@/lib/utils";

interface ErrorDisplayProps {
  error: string;
  className?: string;
}

export const ErrorDisplay = ({ error, className = "" }: ErrorDisplayProps) => {
  const [showDetail, setShowDetail] = useState(false);
  const { summary, detail } = friendlyError(error);
  const hasDifferentDetail = summary !== detail;

  return (
    <div className={`text-destructive ${className}`}>
      <div className="flex items-center space-x-2">
        <AlertCircle size={16} className="shrink-0" />
        <span className="text-sm font-medium">{summary}</span>
        {hasDifferentDetail && (
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="text-xs text-muted-foreground underline flex items-center space-x-1 hover:text-foreground"
          >
            <span>{showDetail ? "Hide" : "Details"}</span>
            {showDetail ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
      {showDetail && hasDifferentDetail && (
        <div className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded-md font-mono break-all">
          {detail}
        </div>
      )}
    </div>
  );
};
