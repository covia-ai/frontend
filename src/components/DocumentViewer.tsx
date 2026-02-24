'use client'

import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "./ui/dialog";

const CONTENT_TYPE_TO_FILE_TYPE: Record<string, string> = {
  "text/csv": "csv",
  "text/plain": "txt",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/webp": "webp",
  "image/tiff": "tiff",
  "image/svg+xml": "svg",
  "text/html": "html",
  "application/xhtml+xml": "html",
};

interface DocumentViewerProps {
  contentUrl: string;
  contentType: string;
}

export const DocumentViewer = ({ contentUrl, contentType }: DocumentViewerProps) => {
  const fileType = CONTENT_TYPE_TO_FILE_TYPE[contentType];

  if (!fileType) return null;

  return (
    <Dialog>
      <DialogTrigger className="text-sm text-secondary dark:text-secondary-light underline">
        View
      </DialogTrigger>
      <DialogContent className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 max-h-[90vh] w-full max-w-4xl p-4 flex flex-col overflow-hidden border dark:border-zinc-700">
        <DialogHeader className="text-sm font-medium text-muted-foreground">
          Document Preview
        </DialogHeader>
        <div className="flex-1 min-h-0 h-[500px] w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800">
          <DocViewer
            documents={[{ uri: contentUrl, fileType }]}
            pluginRenderers={DocViewerRenderers}
            config={{
              header: { disableHeader: true },
            }}
            style={{ height: "100%", backgroundColor: "transparent" }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
