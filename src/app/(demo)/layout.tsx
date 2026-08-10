
import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { VenueRuntimeProvider } from "@/components/VenueRuntimeProvider";
import { Toaster } from "sonner";


export default async function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return <>
      <VenueRuntimeProvider>
        <AdminPanelLayout>
          {children}
        </AdminPanelLayout>
      </VenueRuntimeProvider>
         {/* select-text overrides sonner's drag-to-dismiss styling so error
             details can be selected and copied out of a toast. Widened a
             little past sonner's 356px default so the longer job-error
             previews (see lib/notify.ts) don't wrap as tightly. */}
         <Toaster
           style={{ "--width": "420px" } as React.CSSProperties}
           toastOptions={{ classNames: { toast: "select-text cursor-text", description: "select-text" } }}
         />
    </>
}
