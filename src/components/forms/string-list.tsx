"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Input } from "@/components/ui/base";

/**
 * Chip input for the six plain `string[]` fields on the profile (area served,
 * languages, keywords and so on). Enter or comma commits, backspace on an empty
 * box removes the last chip.
 */
export function StringList({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const entry = raw.trim().replace(/,$/, "");
    if (entry && !value.includes(entry)) onChange([...value, entry]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-1 rounded-md border border-border-strong bg-elevated px-2 py-1 text-[12px]"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="text-faint transition-colors hover:text-danger"
                aria-label={`Remove ${item}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        value={draft}
        placeholder={placeholder ?? "Type and press Enter"}
        onChange={(e) => {
          const next = e.target.value;
          if (next.endsWith(",")) commit(next);
          else setDraft(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && draft === "" && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft && commit(draft)}
      />
    </div>
  );
}
