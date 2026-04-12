import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-transparent bg-slate-900 text-white",
        secondary: "border-transparent bg-slate-100 text-slate-600",
        outline: "border-slate-200 bg-white/70 text-slate-600",
        critical: "border-red-200 bg-red-50 text-red-700",
        high: "border-amber-200 bg-amber-50 text-amber-700",
        research: "border-violet-200 bg-violet-50 text-violet-700",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700",
        defense: "border-sky-200 bg-sky-50 text-sky-700"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
