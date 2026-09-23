"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/base";

export function CopyField({
  label,
  hint,
  value,
  secret = false,
}: {
  label: string;
  hint: string;
  value: string;
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!secret);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard is blocked in some contexts; revealing lets them select it.
      setRevealed(true);
    }
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[13px] font-medium text-text">{label}</p>
        <p className="text-[12px] text-faint">{hint}</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text">
          {revealed ? value : "•".repeat(Math.min(value.length, 44))}
        </code>
        {secret && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide" : "Reveal"}
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
