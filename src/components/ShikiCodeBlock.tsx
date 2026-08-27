"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { notifyError } from "@/lib/notify";
import { cn, writeTextToClipboard } from "@/lib/utils";
import { highlightCode, supportedShikiLanguage } from "@/lib/shiki";

type ShikiCodeBlockProps = {
  code: string;
  language?: string;
  highlight?: boolean;
  showLineNumbers?: boolean;
  wrapLongLines?: boolean;
  className?: string;
};

export function ShikiCodeBlock({
  code,
  language,
  highlight = true,
  showLineNumbers = false,
  wrapLongLines = false,
  className,
}: ShikiCodeBlockProps) {
  const supportedLanguage = supportedShikiLanguage(language);
  const highlightKey = `${supportedLanguage ?? "text"}\0${code}`;
  const [highlighted, setHighlighted] = useState<{
    key: string;
    html: string | null;
  }>({ key: "", html: null });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    if (!highlight || !supportedLanguage) return () => {
      active = false;
    };

    void highlightCode(code, supportedLanguage).then((result) => {
      if (active) setHighlighted({ key: highlightKey, html: result });
    });
    return () => {
      active = false;
    };
  }, [code, highlight, highlightKey, supportedLanguage]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyCode = async () => {
    try {
      await writeTextToClipboard(code);
      setCopied(true);
    } catch (error) {
      notifyError("Unable to copy code", error);
    }
  };

  return (
    <div
      className={cn(
        "my-5 overflow-hidden rounded-xl border border-white/10 bg-[#24292e] text-[#e1e4e8] shadow-sm",
        className,
      )}
    >
      <div className="flex h-9 items-center border-b border-white/10 px-3 text-xs text-white/65">
        <span className="font-mono">{language || "text"}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto h-7 gap-1.5 px-2 text-xs text-white/65 hover:bg-white/10 hover:text-white"
          aria-label="Copy code"
          onClick={copyCode}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {highlighted.key === highlightKey && highlighted.html ? (
        <div
          data-testid="highlighted-code-block"
          className={cn(
            "[&_.shiki]:m-0 [&_.shiki]:overflow-x-auto [&_.shiki]:bg-transparent! [&_.shiki]:p-4 [&_code]:font-mono [&_code]:text-sm [&_code]:leading-6",
            showLineNumbers && "shiki-line-numbers",
            wrapLongLines && "shiki-wrap-lines",
          )}
          dangerouslySetInnerHTML={{ __html: highlighted.html }}
        />
      ) : (
        <pre
          data-testid="unhighlighted-code-block"
          className={cn(
            "overflow-x-auto p-4 font-mono text-sm leading-6 whitespace-pre",
            wrapLongLines && "whitespace-pre-wrap break-words",
          )}
        >
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
