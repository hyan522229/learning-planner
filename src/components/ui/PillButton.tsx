import { cn } from "@/utils/cn";
import { type ButtonHTMLAttributes } from "react";

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function PillButton({ children, className, active, ...props }: PillButtonProps) {
  return (
    <button
      className={cn(
        "group relative cursor-pointer px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 overflow-hidden",
        active
          ? "bg-blue-600 text-white ring-2 ring-blue-300"
          : "border border-gray-300 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50",
        className
      )}
      {...props}
    >
      {/* Top layer: visible normally, slides up on hover */}
      <span className="flex items-center gap-1.5 group-hover:-translate-y-full group-hover:opacity-0 transition-all duration-300">
        {children}
      </span>
      {/* Bottom layer: hidden below, slides up on hover */}
      <span className={cn(
        "absolute inset-0 flex items-center justify-center gap-1.5 transition-all duration-300 translate-y-full opacity-0",
        "group-hover:translate-y-0 group-hover:opacity-100",
        active ? "text-white" : "bg-blue-600 text-white",
      )}>
        {children}
      </span>
    </button>
  );
}
