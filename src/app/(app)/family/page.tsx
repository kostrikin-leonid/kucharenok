import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  AddMemberForm,
  InviteLinkGenerator,
} from "@/components/family/family-panel";
import { Badge } from "@/components/ui/badge";
import type { HouseholdRole } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { isManager } from "@/lib/household/access";
import { uk } from "@/lib/i18n/uk";
import { memberStatusUk } from "@/lib/i18n/member-status";
import { roleLabelUk } from "@/lib/i18n/roles";

export default async function FamilyPage() {
  const session = await auth();
  const householdId = session?.user?.householdId;
  const role = session?.user?.role as HouseholdRole | undefined;
  if (!householdId) redirect("/dashboard");

  const members = await prisma.householdMember.findMany({
    where: { householdId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const canManage = role ? isManager(role) : false;

  return (
    <div className="space-y-8">
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight text-[#001f3f]">
          {uk.family.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{uk.family.subtitle}</p>
      </div>
      <ul className="space-y-3">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f9fafb] bg-white px-4 py-4 shadow-[var(--shadow-card)]"
          >
            <div>
              <p className="font-medium">
                {m.user?.name ??
                  m.user?.email ??
                  m.invitedEmail ??
                  uk.family.pendingUser}
              </p>
              <p className="text-xs text-muted-foreground">
                {m.user?.email ?? m.invitedEmail}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{roleLabelUk(m.role)}</Badge>
              <Badge variant="outline">{memberStatusUk(m.status)}</Badge>
            </div>
          </li>
        ))}
      </ul>
      {canManage ? (
        <div className="grid gap-6 md:grid-cols-2">
          <AddMemberForm />
          <InviteLinkGenerator />
        </div>
      ) : null}
    </div>
  );
}
