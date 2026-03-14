import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function CardSurface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-surface p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover", className)} {...props} />;
}
