
interface ContentLayoutProps {
  children: React.ReactNode;
}

export function ContentLayout({ children }: ContentLayoutProps) {
  return (
    <div className="bg-background text-foreground ontainer pb-8 px-4 sm:px-8">
     {children}
    </div>
  );
}
