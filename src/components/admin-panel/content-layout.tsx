
interface ContentLayoutProps {
  children: React.ReactNode;
}

export function ContentLayout({ children }: ContentLayoutProps) {
  return (
    // Intentionally not using Tailwind's `container` utility here — it caps
    // max-width per breakpoint (1536px at 2xl), which would undo the grid
    // layouts' xl:/2xl: column scaling on large and ultrawide screens.
    <div className="bg-background text-foreground pb-8 px-4 sm:px-8">
     {children}
    </div>
  );
}
