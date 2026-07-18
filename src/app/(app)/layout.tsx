import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { IdleLogout } from "@/components/IdleLogout";
import { AppShellClient } from "@/components/AppShellClient";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      sessionTimeout: true,
      compactMode: true,
      ministry: {
        select: { name: true },
      },
    },
  });

  return (
    <>
      <IdleLogout timeoutMinutes={profile?.sessionTimeout ?? 30} />
      <AppShellClient
        user={user}
        ministryName={profile?.ministry?.name ?? null}
        compactMode={profile?.compactMode ?? false}
      >
        {children}
      </AppShellClient>
    </>
  );
}
