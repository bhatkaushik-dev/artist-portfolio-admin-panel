"use client";

import { useActionState } from "react";

import { loginAction, type LoginState } from "@/lib/actions/auth";
import { Field, FormError, Input } from "@/components/ui/base";
import { SubmitButton } from "@/components/ui/controls";

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Admin key" htmlFor="key">
        <Input
          id="key"
          name="key"
          type="password"
          autoComplete="off"
          autoFocus
          spellCheck={false}
          placeholder="Paste your key"
          aria-invalid={Boolean(state.error)}
        />
      </Field>

      <FormError>{state.error}</FormError>

      <SubmitButton className="w-full" pendingLabel="Checking…">
        Sign in
      </SubmitButton>
    </form>
  );
}
