import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { uk } from "@/lib/i18n/uk";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#001f3f]">
          {uk.auth.registerTitle}
        </h1>
        <p className="text-sm text-[#6b7280]">{uk.auth.registerSubtitle}</p>
      </div>
      <RegisterForm />
      <Link
        href="/login"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "justify-center",
        )}
      >
        {uk.auth.alreadyHaveAccount}
      </Link>
    </div>
  );
}
