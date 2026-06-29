import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { IdleLogout } from "@/components/IdleLogout";

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
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <IdleLogout timeoutMinutes={profile?.sessionTimeout ?? 30} />
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} ministryName={profile?.ministry?.name ?? null} notifications={profile?.notifications ?? []} />
        <main className={`flex-1 overflow-y-auto ${profile?.compactMode ? "p-3" : "p-6"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
