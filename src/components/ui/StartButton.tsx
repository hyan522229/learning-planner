import { Button } from "@/components/ui/Button";
import { ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

interface StartButtonProps {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline";
  onClick?: () => void;
  disabled?: boolean;
}

export function StartButton({
  children,
  className,
  size = "lg",
  variant = "default",
  onClick,
  disabled,
}: StartButtonProps) {
  return (
    <Button
      className={cn("group relative overflow-hidden", className)}
      size={size}
      variant={variant}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="mr-8 transition-opacity duration-500 group-hover:opacity-0">
        {children}
      </span>
      <i className={cn(
        "absolute right-1 top-1 bottom-1 rounded-sm z-10 grid w-1/4 place-items-center transition-all duration-500 group-hover:w-[calc(100%-0.5rem)] group-active:scale-95",
        variant === "outline" ? "bg-muted" : "bg-white/20",
      )}>
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" className="text-foreground" />
      </i>
    </Button>
  );
}
