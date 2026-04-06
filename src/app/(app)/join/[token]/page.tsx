import { auth } from "@/auth";
import { JoinClient } from "@/components/family/join-client";
import { uk } from "@/lib/i18n/uk";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <p className="text-sm text-muted-foreground">
        {uk.family.joinSignInFirst}
      </p>
    );
  }
  return (
    <div className="mx-auto max-w-md space-y-4 py-4 md:py-12">
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold text-[#001f3f]">
          {uk.family.joinTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {uk.family.joinSubtitle}
        </p>
      </div>
      <p className="text-sm text-muted-foreground md:hidden">
        {uk.family.joinSubtitle}
      </p>
      <JoinClient token={token} userId={session.user.id} />
    </div>
  );
}
