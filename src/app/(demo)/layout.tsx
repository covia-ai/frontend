
import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { Toaster } from "sonner";


export default async function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return <>
       <AdminPanelLayout>
         {children}
       </AdminPanelLayout>
         {/* select-text overrides sonner's drag-to-dismiss styling so error
             details can be selected and copied out of a toast. */}
         <Toaster toastOptions={{ classNames: { toast: "select-text cursor-text", description: "select-text" } }} />
    </>
}
