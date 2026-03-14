"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="riskiq-theme">
      {children}
    </ThemeProvider>
  );
};
