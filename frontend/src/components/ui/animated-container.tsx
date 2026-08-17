import * as React from "react";
import { cn } from "@/lib/utils";

interface AnimatedContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
  children: React.ReactNode;
}

/** Fade-in + slide-up on mount. Use as a page wrapper or section wrapper. */
export function PageFadeIn({ className, children, ...props }: AnimatedContainerProps) {
  return (
    <div className={cn("animate-page-fade-in", className)} {...props}>
      {children}
    </div>
  );
}

/** Staggered list: each direct child animates in with incremental delay. */
export function StaggeredList({ className, children, delay = 60, ...props }: AnimatedContainerProps) {
  return (
    <div className={cn(className)} {...props}>
      {React.Children.map(children, (child, i) => {
        if (!React.isValidElement(child)) return child;
        return (
          <div
            className="animate-stagger-in"
            style={{ animationDelay: `${i * delay}ms` }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
