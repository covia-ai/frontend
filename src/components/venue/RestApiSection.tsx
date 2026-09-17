"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/CopyField";
import { Globe, ExternalLink } from "lucide-react";
import { TypeTile } from "@/components/TypeTile";

interface RestApiSectionProps {
  baseUrl: string;
}

const DOC_LINKS = [
  { path: "/openapi", label: "OpenAPI Spec" },
  { path: "/swagger", label: "Swagger UI" },
  { path: "/redoc", label: "ReDoc" },
] as const;

// REST base URL + generated API docs (#258) — pure links, no fetch: Swagger
// and ReDoc are full HTML UIs meant to be opened directly, not embedded.
export function RestApiSection({ baseUrl }: RestApiSectionProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <TypeTile Icon={Globe} tile="bg-secondary/15 text-secondary" className="size-10 rounded-lg" iconSize={20} />
        <div>
          <h2 className="text-lg font-medium">REST API</h2>
          <p className="text-sm text-muted-foreground">Base URL and generated API documentation</p>
        </div>
      </div>

      <CopyField label="REST Base URL" value={baseUrl} href={baseUrl} className="mb-4" />

      <div className="flex flex-wrap gap-3">
        {DOC_LINKS.map(({ path, label }) => (
          <Button key={path} asChild variant="outline" className="flex items-center gap-2">
            <a href={`${baseUrl}${path}`} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              {label}
            </a>
          </Button>
        ))}
      </div>
    </Card>
  );
}
