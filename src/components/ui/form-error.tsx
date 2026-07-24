import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormError({
  message,
  icon = false,
  className,
}: {
  message?: string;
  icon?: boolean;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p className={cn("flex items-center gap-1.5 text-sm text-red-600", className)}>
      {icon && <AlertCircle className="size-4 shrink-0" />}
      {message}
    </p>
  );
}
