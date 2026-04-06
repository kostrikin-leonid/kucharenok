import type { MemberStatus } from "@/generated/prisma";

import { uk } from "./uk";

export function memberStatusUk(status: MemberStatus): string {
  switch (status) {
    case "active":
      return uk.family.statusActive;
    case "invited":
      return uk.family.statusPending;
    default:
      return status;
  }
}
