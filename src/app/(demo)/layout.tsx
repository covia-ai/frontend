
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
         <Toaster />
    </>
}
