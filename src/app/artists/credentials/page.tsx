import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { Button, Card, PageHeader } from "@/components/ui/base";
import { requireSuper, takeFlashCredentials } from "@/lib/session/session";
import { CopyField } from "./copy-field";

export const metadata = { title: "Keys · Portfolio Admin" };

/**
 * Read-and-destroy: the credentials live in a 120-second sealed cookie, so a
 * refresh or a shared link shows nothing. The admin key is not recoverable
 * afterwards — only a rotation issues a new one.
 */
export default async function CredentialsPage() {
  await requireSuper();
  const credentials = await takeFlashCredentials();
  if (!credentials) redirect("/artists");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Keys for ${credentials.name}`}
        description="Copy these now — the admin key is never shown again."
      />

      <Card className="mb-4 border-warning/30 bg-warning/5 px-5 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-[13px] leading-relaxed text-text">
            The admin key is stored hashed-in-place and cannot be retrieved later.
            If it is lost, you will have to rotate it, which locks out anyone still
            using the old one.
          </p>
        </div>
      </Card>

      <Card className="divide-y divide-border">
        <CopyField
          label="Admin key"
          hint="Secret. The artist uses this to sign in here and to write content."
          value={credentials.adminKey}
          secret
        />
        <CopyField
          label="Site key"
          hint="Not secret. Their public site sends this as the X-Site-Key header."
          value={credentials.siteKey}
        />
        <CopyField
          label="Slug"
          hint="Used in media storage paths."
          value={credentials.slug}
        />
      </Card>

      <div className="mt-6 flex justify-end">
        <Link href="/artists">
          <Button variant="primary">I have saved these</Button>
        </Link>
      </div>
    </div>
  );
}
