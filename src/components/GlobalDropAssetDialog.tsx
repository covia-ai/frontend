"use client";

import dynamic from "next/dynamic";
import { UploadCloud } from "lucide-react";
import { useGlobalFileDrop, useGlobalFileDropListener } from "@/hooks/use-global-file-drop";

// The wizard pulls in json-edit-react and the Radix form primitives, so it
// loads only once a file is dropped rather than with every page (#472).
const CreateAssetComponent = dynamic(
  () => import("@/components/CreateAssetComponent").then((module) => module.CreateAssetComponent),
  { ssr: false },
);

// Mounted once in AdminPanelLayout. Owns the app-wide drag overlay and, once
// a file is dropped, mounts a controlled CreateAssetComponent in fast-path
// mode — keyed on dropId so a second drop always gets a fresh wizard
// instance rather than reusing stale internal state from the last one.
export function GlobalDropAssetDialog() {
  useGlobalFileDropListener();
  const { isDragging, droppedFile, dropId, clear } = useGlobalFileDrop();

  return (
    <>
      {isDragging && (
        <div
          data-testid="global-drop-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none"
        >
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-primary p-12 text-primary">
            <UploadCloud size={40} />
            <p className="text-lg font-medium">Drop to register as asset</p>
          </div>
        </div>
      )}
      {droppedFile && (
        <CreateAssetComponent
          key={dropId}
          open
          onOpenChange={(next) => { if (!next) clear(); }}
          initialFile={droppedFile}
        />
      )}
    </>
  );
}
