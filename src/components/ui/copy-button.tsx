"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copiar",
  copiedLabel = "Copiado!",
  showIcon = false,
  className,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  showIcon?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(showIcon && "gap-1.5", className)}
      onClick={handleCopy}
    >
      {showIcon && (copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />)}
      {copied ? copiedLabel : label}
    </Button>
  );
}
