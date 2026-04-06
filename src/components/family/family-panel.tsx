"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addMemberByEmailAction, createInviteAction } from "@/actions/family";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uk } from "@/lib/i18n/uk";

export function AddMemberForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3 rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const email = String(fd.get("email"));
        start(async () => {
          const r = await addMemberByEmailAction({ email });
          if (r?.error) toast.error(r.error);
          else toast.success(uk.family.memberAddedToast);
          router.refresh();
        });
      }}
    >
      <Label>{uk.family.addByEmailTitle}</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          name="email"
          type="email"
          required
          placeholder={uk.auth.emailPlaceholder}
        />
        <Button type="submit" disabled={pending}>
          {uk.family.addMemberButton}
        </Button>
      </div>
    </form>
  );
}

export function InviteLinkGenerator() {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm">
      <p className="text-sm font-medium">{uk.family.inviteLinkTitle}</p>
      <p className="text-xs text-muted-foreground">{uk.family.inviteLinkHint}</p>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const r = await createInviteAction("pending@invite.local");
            const full =
              typeof window !== "undefined"
                ? `${window.location.origin}${r.url}`
                : r.url;
            setUrl(full);
            toast.success(uk.family.inviteCreatedToast);
          });
        }}
      >
        {uk.family.generateInviteLink}
      </Button>
      {url ? (
        <p className="break-all text-xs text-muted-foreground">{url}</p>
      ) : null}
    </div>
  );
}
