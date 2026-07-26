import * as React from "react";
import { cn } from "@/lib/utils";

const SHIMMER =
  "relative overflow-hidden bg-surface-muted before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-card/80 before:to-transparent";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md", SHIMMER, className)} {...props} />;
}

export { Skeleton };
