import { cn } from "@/lib/utils";

interface ContentContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Remove the max-width cap for full-bleed layouts */
  fluid?: boolean;
}

export function ContentContainer({ children, className, fluid }: ContentContainerProps) {
  return (
    <div
      className={cn(
        "w-full",
        !fluid && "max-w-screen-xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
}
