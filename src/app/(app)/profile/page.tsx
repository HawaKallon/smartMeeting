import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { ProfilePageClient } from "./ProfilePageClient";

export default async function ProfilePage() {
  const user = await requireUser();
  const freshUser = await prisma.user.findUnique({ where: { id: user.id } });

  if (!freshUser) {
    return <div className="text-center text-muted-foreground">User not found</div>;
  }

  // Fetch user statistics
  const [organizedEvents, attendedEvents, actionItems, upcomingEvents] = await Promise.all([
    prisma.event.count({ where: { organizerId: user.id } }),
    prisma.attendance.count({ where: { userId: user.id } }),
    prisma.actionItem.count({ where: { ownerId: user.id } }),
    prisma.event.count({
      where: {
        attendees: { some: { userId: user.id } },
        startAt: { gte: new Date() },
      },
    }),
  ]);

  return (
    <ProfilePageClient
      user={freshUser}
      stats={{
        organizedEvents,
        attendedEvents,
        actionItems,
        upcomingEvents,
      }}
    />
  );
}
