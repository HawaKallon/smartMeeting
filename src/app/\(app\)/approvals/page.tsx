import { BackButton } from "@/components/BackButton";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { canApproveMinutes, isSuperAdmin } from "@/lib/roles";
import { isMinutesArchived } from "@/lib/minutesPolicy";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

export default async function ApprovalsPage() {
  const user = await requireUser();

  // Gate: only LEADERSHIP, MINISTER, or SUPER_ADMIN
  if (!canApproveMinutes(user.systemRole) && !isSuperAdmin(user.systemRole)) {
    return (
      <div className="space-y-6">
        <BackButton href="/administrative" label="Dashboard" />
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Query SUBMITTED OFFICIAL minutes for user's ministry (or all if SUPER_ADMIN)
  const minutesAwaitingApproval = await prisma.minutes.findMany({
    where: {
      status: "SUBMITTED",
      event: {
        scope: "OFFICIAL",
        ...(isSuperAdmin(user.systemRole) ? {} : { ministryId: user.ministryId }),
      },
    },
    select: {
      id: true,
      eventId: true,
      summary: true,
      submittedAt: true,
      submitted: { select: { name: true, email: true } },
      event: { select: { id: true, title: true, startAt: true } },
    },
    orderBy: { submittedAt: "asc" },
  });

  // Filter out archived minutes
  const activeMinutes = minutesAwaitingApproval.filter(
    (m) => !isMinutesArchived(m.event.startAt),
  );

  // Serialize dates for rendering
  const serialized = activeMinutes.map((m) => ({
    ...m,
    submittedAt: m.submittedAt?.toISOString() || null,
    event: {
      ...m.event,
      startAt: m.event.startAt.toISOString(),
    },
  }));

  return (
    <div className="space-y-6">
      <div>
        <BackButton href="/administrative" label="Dashboard" />
        <h1 className="mt-4 text-3xl font-bold text-foreground flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-sidebar-primary" />
          Approvals
        </h1>
      </div>

      {/* Minutes awaiting approval */}
      <div className="rounded-[1.5rem] border border-border bg-card shadow-[0_20px_60px_rgba(0,53,128,0.08)] overflow-hidden">
        <div className="border-b border-border bg-secondary/60 px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Minutes Awaiting Approval</h2>
        </div>

        {serialized.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-muted-foreground">No minutes awaiting approval.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  {["Meeting", "Submitted By", "Submitted On", ""].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {serialized.map((m, i) => (
                  <tr
                    key={m.id}
                    className={`transition-colors hover:bg-secondary/35 ${
                      i < serialized.length - 1 ? "border-b border-border/50" : ""
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-foreground">{m.event.title}</p>
                        {m.summary && (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {m.summary}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {m.submitted?.name || m.submitted?.email || "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {m.submittedAt
                        ? new Date(m.submittedAt).toLocaleString("en-GB", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/administrative/events/${m.event.id}/minutes`}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
