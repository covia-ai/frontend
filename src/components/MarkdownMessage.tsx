"use client";

import {
  Children,
  isValidElement,
  memo,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { ShikiCodeBlock } from "@/components/ShikiCodeBlock";
import { cn } from "@/lib/utils";

type MarkdownMessageProps = {
  children: string;
  className?: string;
};

type PositionedNode = {
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

type CodeChildProps = {
  children?: ReactNode;
  className?: string;
};

function fenceIsComplete(markdown: string, node: PositionedNode | undefined) {
  const start = node?.position?.start?.offset;
  const end = node?.position?.end?.offset;
  if (start == null || end == null) return false;

  const source = markdown.slice(start, end);
  const opening = source.match(/^ {0,3}(`{3,}|~{3,})/);
  if (!opening) return false;

  const marker = opening[1][0];
  const minimumLength = opening[1].length;
  const closingFence = new RegExp(
    `^ {0,3}${marker === "`" ? "`" : "~"}{${minimumLength},}\\s*$`,
    "m",
  );
  return closingFence.test(source.slice(opening[0].length));
}

function markdownComponents(markdown: string): Components {
  return {
    p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
    h1: ({ children }) => <h1 className="mb-3 mt-6 text-xl font-semibold first:mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="mb-3 mt-6 text-lg font-semibold first:mt-0">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-2 mt-5 font-semibold first:mt-0">{children}</h3>,
    ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-6 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-6 last:mb-0">{children}</ol>,
    li: ({ children }) => <li className="pl-1">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-2 border-primary/50 pl-4 text-muted-foreground">
        {children}
      </blockquote>
    ),
    a: ({ children, className, node: _node, ...props }) => (
      <a
        {...props}
        className={cn("font-medium text-primary underline underline-offset-4", className)}
        target="_blank"
        rel="noreferrer noopener"
      >
        {children}
      </a>
    ),
    table: ({ children }) => (
      <div className="my-5 overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-left text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-muted/70">{children}</thead>,
    th: ({ children }) => <th className="border-b px-3 py-2 font-semibold">{children}</th>,
    td: ({ children }) => <td className="border-b px-3 py-2 align-top last:border-r-0">{children}</td>,
    code: ({ children, className, node: _node, ...props }) => (
      <code
        {...props}
        className={cn(
          "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] break-words",
          className,
        )}
      >
        {children}
      </code>
    ),
    pre: ({ children, node }) => {
      const child = Children.only(children);
      if (!isValidElement<CodeChildProps>(child)) return <pre>{children}</pre>;

      const className = child.props.className ?? "";
      const language = /language-([\w-]+)/.exec(className)?.[1];
      const code = String(child.props.children ?? "").replace(/\n$/, "");
      return (
        <ShikiCodeBlock
          code={code}
          language={language}
          highlight={fenceIsComplete(markdown, node)}
        />
      );
    },
  };
}

function MarkdownMessageComponent({ children, className }: MarkdownMessageProps) {
  return (
    <div className={cn("agent-markdown", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        skipHtml
        components={markdownComponents(children)}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

// Streaming updates replace the accumulated string. ReactMarkdown reparses
// that full buffer on each update, which safely handles partial Markdown;
// memo avoids work when unrelated chat state changes.
export const MarkdownMessage = memo(MarkdownMessageComponent);
