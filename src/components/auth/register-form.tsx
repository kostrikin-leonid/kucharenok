"use client";

import { useFormState } from "react-dom";

import { registerAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uk } from "@/lib/i18n/uk";

const initial: { error?: string } = {};

export function RegisterForm() {
  const [state, action] = useFormState(registerAction, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="name">{uk.auth.yourName}</Label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="householdName">{uk.auth.householdName}</Label>
        <Input
          id="householdName"
          name="householdName"
          required
          placeholder={uk.auth.householdPlaceholder}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{uk.auth.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={uk.auth.emailPlaceholder}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{uk.auth.passwordMin}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" className="w-full">
        {uk.auth.createAccount}
      </Button>
    </form>
  );
}
