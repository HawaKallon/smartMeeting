import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Show the user's ministry name in the header (super-admins have no ministry).
  const ministry = user.ministryId
    ? await prisma.ministry.findUnique({
        where: { id: user.ministryId },
        select: { name: true },
      })
    : null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} ministryName={ministry?.name ?? null} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
