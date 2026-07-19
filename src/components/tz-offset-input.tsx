"use client";
import { useState } from "react";

/** Envia o offset do fuso do browser (minutos, padrão getTimezoneOffset) junto do form. */
export function TzOffsetInput() {
  const [offset] = useState(() => new Date().getTimezoneOffset());
  return <input type="hidden" name="tzOffset" value={offset} />;
}
