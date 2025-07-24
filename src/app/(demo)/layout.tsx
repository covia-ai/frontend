
import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";


export default async function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  return <SessionProvider>
   
       <AdminPanelLayout>
         {children}
       </AdminPanelLayout>
         <Toaster />
    </SessionProvider>
}
