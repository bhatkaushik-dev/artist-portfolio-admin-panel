"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "./base";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full border border-border-strong bg-elevated",
        "transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-muted transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-white" />
    </SwitchPrimitive.Root>
  );
}

export function SwitchField({
  label,
  hint,
  checked,
  onCheckedChange,
  name,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  name?: string;
}) {
  const id = React.useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-[13px] font-medium text-text">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-[12px] text-faint">{hint}</p>}
      </div>
      <Switch id={id} name={name} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-md px-3 py-1.5 text-[13px] font-medium text-muted transition-colors",
        "hover:text-text data-[state=active]:bg-elevated data-[state=active]:text-text",
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;

/**
 * Sits inside a `<form action={...}>` and reflects that form's pending state,
 * so a plain server-action form needs no client state of its own.
 */
export function SubmitButton({
  children = "Save",
  pendingLabel = "Saving…",
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending} {...props}>
      {pending && <Loader2 size={14} className="animate-spin" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
