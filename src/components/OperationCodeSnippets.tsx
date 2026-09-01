"use client";

import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copyDataToClipBoard } from "@/lib/utils";
import {
  buildSnippetInput,
  curlSnippet,
  pythonSnippet,
  typescriptSnippet,
} from "@/lib/operation-snippets";
import type { OperationInputSchema } from "@/lib/operation-input";

type Language = "curl" | "typescript" | "python";

const LANGUAGES: Language[] = ["curl", "typescript", "python"];
const LANGUAGE_LABELS: Record<Language, string> = {
  curl: "curl",
  typescript: "TypeScript",
  python: "Python",
};

type OperationCodeSnippetsProps = {
  baseUrl: string;
  assetId: string;
  schema?: OperationInputSchema;
  // The Run tab's current input — reused here so a snippet reflects whatever
  // the user has already typed, rather than only schema defaults/examples.
  liveInput: unknown;
};

export function OperationCodeSnippets({
  baseUrl,
  assetId,
  schema,
  liveInput,
}: OperationCodeSnippetsProps) {
  const [language, setLanguage] = useState<Language>("curl");

  const input = useMemo(
    () => buildSnippetInput(schema, liveInput),
    [schema, liveInput],
  );

  const snippets = useMemo<Record<Language, string>>(
    () => ({
      curl: curlSnippet(baseUrl, assetId, input),
      typescript: typescriptSnippet(baseUrl, assetId, input),
      python: pythonSnippet(baseUrl, assetId, input),
    }),
    [baseUrl, assetId, input],
  );

  return (
    <Card className="bg-background border-muted w-full my-2 rounded-md" data-testid="operation-code-snippets">
      <CardContent>
        <Tabs value={language} onValueChange={(value) => setLanguage(value as Language)}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <TabsList>
              {LANGUAGES.map((lang) => (
                <TabsTrigger key={lang} value={lang} data-testid={`snippet-tab-${lang}`}>
                  {LANGUAGE_LABELS[lang]}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              data-testid="copy-snippet"
              onClick={() => copyDataToClipBoard(snippets[language], `${LANGUAGE_LABELS[language]} snippet copied`)}
            >
              <Copy size={14} /> Copy
            </Button>
          </div>
          {LANGUAGES.map((lang) => (
            <TabsContent key={lang} value={lang}>
              <pre
                data-testid={`snippet-${lang}`}
                className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre"
              >
                {snippets[lang]}
              </pre>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
