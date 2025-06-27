
import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { SessionProvider } from "next-auth/react";


export default async function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  return <SessionProvider>
   
       <AdminPanelLayout>
         {children}
       </AdminPanelLayout>
   
    </SessionProvider>
}
