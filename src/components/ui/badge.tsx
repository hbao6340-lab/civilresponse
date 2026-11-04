import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "green" | "orange" | "blue" | "grey" | "red" | "navy" | "neutral";

const tones: Record<Tone, string> = {
  green: "bg-emerald-100 text-emerald-900 border-emerald-200",
  orange: "bg-orange-100 text-orange-900 border-orange-200",
  blue: "bg-blue-100 text-blue-900 border-blue-200",
  grey: "bg-slate-100 text-slate-700 border-slate-200",
  red: "bg-red-100 text-red-900 border-red-200",
  navy: "bg-[#0b2545] text-white border-[#0b2545]",
  neutral: "bg-white text-slate-700 border-slate-200",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
