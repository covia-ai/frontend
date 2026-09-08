"use client";

import { Card } from "@/components/ui/card";
import { Package, Copy } from "lucide-react";
import { copyDataToClipBoard } from "@/lib/utils";

interface SdkInstallSnippetsProps {
  baseUrl: string;
}

const INSTALL_COMMAND = "npm install @covia/covia-sdk";

// TypeScript-only quickstart (#258) — @covia/covia-sdk is the only confirmed
// SDK; a single language doesn't need tab chrome like OperationCodeSnippets.
export function SdkInstallSnippets({ baseUrl }: SdkInstallSnippetsProps) {
  const quickstart = `import { Venue } from "@covia/covia-sdk";

const venue = await Venue.connect("${baseUrl}");
const status = await venue.status();`;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-primary-vlight p-2 rounded-lg">
          <Package size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-medium">SDK</h2>
          <p className="text-sm text-muted-foreground">Install and connect with @covia/covia-sdk</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Install</p>
            <button
              className="text-xs text-primary flex items-center gap-1 hover:underline"
              onClick={() => copyDataToClipBoard(INSTALL_COMMAND, "Install command copied")}
            >
              <Copy size={11} /> Copy
            </button>
          </div>
          <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre">{INSTALL_COMMAND}</pre>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Quickstart</p>
            <button
              className="text-xs text-primary flex items-center gap-1 hover:underline"
              onClick={() => copyDataToClipBoard(quickstart, "Quickstart snippet copied")}
            >
              <Copy size={11} /> Copy
            </button>
          </div>
          <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre">{quickstart}</pre>
        </div>
      </div>
    </Card>
  );
}
