"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";

// process.env.NEXT_PUBLIC_APP_URL é inlined no build; se ausente em runtime,
// cai em window.location.origin. Calculado uma vez no initializer do useState
// (não em efeito) para não disparar setState-em-effect.
function resolveOrigin() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export default function ShareLink({ publicToken }: { publicToken: string }) {
  const [origin] = useState(resolveOrigin);
  const [copied, setCopied] = useState(false);

  const url = `${origin}/r/${publicToken}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <div className="rounded-lg border bg-white p-3">
        <QRCodeSVG value={url} size={160} />
      </div>
      <div className="space-y-2">
        <p className="break-all font-mono text-sm">{url}</p>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "Copiado!" : "Copiar link"}
        </Button>
      </div>
    </div>
  );
}
