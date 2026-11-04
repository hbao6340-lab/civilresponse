import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-[#0b2545] text-white hover:bg-[#13315c] disabled:bg-slate-300",
  secondary:
    "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50",
  danger: "bg-red-700 text-white hover:bg-red-800 disabled:bg-slate-300",
  ghost: "text-slate-700 hover:bg-slate-100 disabled:opacity-50",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  asChild?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  asChild,
  className,
  children,
  ...rest
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(base, variants[variant], className)} {...rest}>
      {children}
    </Comp>
  );
}
