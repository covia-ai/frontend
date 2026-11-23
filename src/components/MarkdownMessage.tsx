"use client";

import { memo } from "react";

import { MarkdownBody } from "@/components/MarkdownBody";

// Streaming updates replace the accumulated string. ReactMarkdown reparses
// that full buffer on each update, which safely handles partial Markdown;
// memo avoids work when unrelated chat state changes.
export const MarkdownMessage = memo(MarkdownBody);
