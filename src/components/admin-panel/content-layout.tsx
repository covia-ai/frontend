import { Navbar } from "@/components/admin-panel/navbar";

interface ContentLayoutProps {
  children: React.ReactNode;
}

export function ContentLayout({ children }: ContentLayoutProps) {
  return (
    <div className="bg-background text-foreground">
      <Navbar />
      <div className="container pt-8 pb-8 px-4 sm:px-8">{children}</div>
    </div>
  );
}
