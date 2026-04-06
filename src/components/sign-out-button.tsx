"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { uk } from "@/lib/i18n/uk";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(className)}
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      {uk.auth.signOut}
    </Button>
  );
}
