import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { uk } from "@/lib/i18n/uk";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#001f3f]">
          {uk.auth.loginTitle}
        </h1>
        <p className="text-sm text-[#6b7280]">{uk.auth.loginSubtitle}</p>
      </div>
      <Suspense
        fallback={
          <p className="text-center text-sm text-muted-foreground">
            {uk.common.loading}
          </p>
        }
      >
        <LoginForm />
      </Suspense>
      <Link
        href="/register"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "justify-center",
        )}
      >
        {uk.auth.needAccount}
      </Link>
    </div>
  );
}
