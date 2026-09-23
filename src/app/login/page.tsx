import { googleConfigured } from "@/lib/auth/google";
import { GoogleButton } from "./google-button";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Portfolio Admin" };

const MESSAGES: Record<string, string> = {
  cancelled: "Sign-in was cancelled.",
  expired: "That sign-in attempt timed out. Please try again.",
  state: "That sign-in could not be verified. Please try again.",
  exchange: "Google sign-in could not be completed. Please try again.",
  unconfigured: "Google sign-in is not set up on this server yet.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; error?: string; detail?: string; next?: string }>;
}) {
  const { reason, error, detail, next } = await searchParams;
  const withGoogle = googleConfigured();

  // A rejected allowlist check sends its own message; anything else is generic.
  const problem = error === "denied" ? detail : error ? MESSAGES[error] ?? MESSAGES.exchange : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-lg font-semibold text-accent">
            ◈
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Portfolio Admin</h1>
          <p className="mt-1 text-[13px] text-muted">
            {withGoogle ? "Sign in to manage your content." : "Sign in with your admin key."}
          </p>
        </div>

        {reason === "expired" && !problem && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
            Your session ended. Please sign in again.
          </div>
        )}

        {problem && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
            {problem}
          </div>
        )}

        {withGoogle ? (
          <>
            <GoogleButton next={next} />
            <details className="mt-6 group">
              <summary className="cursor-pointer list-none text-center text-[12px] text-faint transition-colors hover:text-muted">
                Use an admin key instead
              </summary>
              <div className="mt-4">
                <LoginForm />
              </div>
            </details>
          </>
        ) : (
          <LoginForm />
        )}

        <p className="mt-6 text-center text-[12px] leading-relaxed text-faint">
          {withGoogle
            ? "Access is by invitation. Ask your administrator if you cannot get in."
            : "Your key is stored only in an encrypted, server-only cookie."}
        </p>
      </div>
    </main>
  );
}
