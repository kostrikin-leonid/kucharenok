import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AiImportClient } from "@/components/recipes/ai-import-client";
import type { HouseholdRole } from "@/generated/prisma";
import { isManager } from "@/lib/household/access";
import { uk } from "@/lib/i18n/uk";

export default async function ImportAiPage() {
  const session = await auth();
  const role = session?.user?.role as HouseholdRole | undefined;
  if (!role || !isManager(role)) {
    redirect("/recipes");
  }
  const aiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {uk.aiImport.pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {uk.aiImport.pageSubtitle}
        </p>
      </div>
      <AiImportClient aiConfigured={aiConfigured} />
    </div>
  );
}
