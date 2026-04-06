import type { HouseholdRole } from "@/generated/prisma";

export function roleLabelUk(role: HouseholdRole): string {
  switch (role) {
    case "owner":
      return "Власник";
    case "admin":
      return "Адмін";
    case "member":
      return "Учасник";
    default:
      return role;
  }
}
