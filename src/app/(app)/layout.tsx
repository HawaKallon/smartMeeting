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

  // Show the user's ministry name in the header (super-admins have no ministry).
  // Also fetch recent notifications for the topbar bell.
  const [ministry, notifications] = await Promise.all([
    user.ministryId
      ? prisma.ministry.findUnique({
          where: { id: user.ministryId },
          select: { name: true },
        })
      : null,
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-background" data-theme={user.theme || "dark"}>
      <IdleLogout timeoutMinutes={user.sessionTimeout ?? 30} />
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} ministryName={ministry?.name ?? null} notifications={notifications} />
        <main className={`flex-1 overflow-y-auto ${user.compactMode ? "p-3" : "p-6"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
