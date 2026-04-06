import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import type { HouseholdRole } from "@/generated/prisma";
import { isManager } from "@/lib/household/access";
import { uk } from "@/lib/i18n/uk";
import { roleLabelUk } from "@/lib/i18n/roles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const role = session.user.role as HouseholdRole | null | undefined;
  const manager = role ? isManager(role) : false;
  const displayName =
    session.user.name ?? session.user.email ?? uk.common.none;
  const roleLabel = role ? roleLabelUk(role) : null;

  return (
    <AppShell
      displayName={displayName}
      roleLabel={roleLabel}
      manager={manager}
    >
      {children}
    </AppShell>
  );
}
