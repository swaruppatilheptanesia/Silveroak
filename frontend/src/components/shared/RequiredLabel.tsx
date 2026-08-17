import type { ReactNode } from 'react';

export function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <span>{children}</span>
      <span className="ml-1 text-destructive">*</span>
    </>
  );
}
