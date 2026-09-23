import { redirect } from "next/navigation";

import { getSession } from "@/lib/session/session";

/** The proxy normally handles this; this keeps the route correct without it. */
export default async function RootPage() {
  const session = await getSession();
  redirect(session.mode === "super" ? "/artists" : session.mode === "tenant" ? "/studio" : "/login");
}
