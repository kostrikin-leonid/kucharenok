"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { acceptInviteAction } from "@/actions/family";
import { Button } from "@/components/ui/button";
import { uk } from "@/lib/i18n/uk";

export function JoinClient({
  token,
  userId,
}: {
  token: string;
  userId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() => {
        start(async () => {
          try {
            await acceptInviteAction(token, userId);
            toast.success(uk.family.joinedToast);
            router.push("/dashboard");
            router.refresh();
          } catch (e) {
            toast.error(
              e instanceof Error ? e.message : uk.family.invalidInviteToast,
            );
          }
        });
      }}
    >
      {pending ? uk.family.joining : uk.family.acceptInvite}
    </Button>
  );
}
