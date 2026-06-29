import { requireUser, ministryScope } from "@/lib/guard";
import { isSuperAdmin } from "@/lib/roles";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { Activity, Filter } from "lucide-react";
import { ActivityFilters } from "./ActivityFilters";

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; ministryId?: string }>;
}) {
  const user = await requireUser();

  // Only ADMIN or SUPER_ADMIN can view activity log
  if (user.role !== "ADMIN" && !isSuperAdmin(user.role)) {
    return (
      <div className="space-y-6">
        <BackButton href="/administrative" label="Dashboard" />
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">You don't have permission to access this page</p>
        </div>
      </div>
    );
  }

  const superAdmin = isSuperAdmin(user.role);
  const { page, action, ministryId } = await searchParams;
  const currentPage = parseInt(page ?? "1", 10);
  const pageSize = 50;
  const skip = (currentPage - 1) * pageSize;

  // Load ministries for super-admin
  const ministries = superAdmin
    ? await prisma.ministry.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  // Build where clause: scope by ministry + filter by action + filter by ministry (super-admin)
  const where: any = { ...ministryScope(user) };
  if (action) where.action = action;
  if (superAdmin && ministryId) where.ministryId = ministryId;

  const [logs, totalCount, uniqueActions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        actor: { select: { id: true, name: true, email: true } },
        ministry: { select: { name: true } },
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where: { ...ministryScope(user) },
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const actionList = uniqueActions.map((a) => a.action);

  return (
    <div className="space-y-6">
      <BackButton href="/administrative" label="Dashboard" />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Platform administration</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Activity Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track all system actions and changes</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-[1.6rem] border border-[#d3e0f0] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] p-5 shadow-[0_14px_35px_rgba(15,35,63,0.07)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Actions</p>
          <p className="mt-3 text-3xl font-semibold text-[#003580]">{totalCount.toLocaleString()}</p>
        </div>
        <div className="rounded-[1.6rem] border border-[#d7e2c6] bg-[linear-gradient(180deg,#fbfff8_0%,#eef7e5_100%)] p-5 shadow-[0_14px_35px_rgba(15,35,63,0.07)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Today</p>
          <p className="mt-3 text-3xl font-semibold text-[#007236]">
            {logs.filter((l) => {
              const today = new Date();
              return l.createdAt.toDateString() === today.toDateString();
            }).length}
          </p>
        </div>
        <div className="rounded-[1.6rem] border border-[#f0dfaa] bg-[linear-gradient(180deg,#fffef8_0%,#fff5d9_100%)] p-5 shadow-[0_14px_35px_rgba(15,35,63,0.07)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Users Active</p>
          <p className="mt-3 text-3xl font-semibold text-[#946200]">
            {new Set(logs.map((l) => l.actorId)).size}
          </p>
        </div>
      </div>

      {/* Filters */}
      <ActivityFilters
        action={action}
        ministryId={ministryId}
        actions={actionList}
        ministries={superAdmin ? ministries : undefined}
        superAdmin={superAdmin}
      />

      <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_18px_45px_rgba(15,35,63,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/45">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">User</th>
                {superAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ministry</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr
                  key={log.id}
                  className={`transition-colors hover:bg-secondary/30 ${idx < logs.length - 1 ? "border-b border-border/50" : ""}`}
                >
                  <td className="px-6 py-3">
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600">
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div>
                      <p className="font-medium text-foreground">{log.actor?.name || "System"}</p>
                      <p className="text-xs text-muted-foreground">{log.actor?.email}</p>
                    </div>
                  </td>
                  {superAdmin && (
                    <td className="px-6 py-3 text-muted-foreground">
                      {log.ministry?.name ?? "—"}
                    </td>
                  )}
                  <td className="px-6 py-3">
                    <div>
                      <p className="text-muted-foreground">{log.entityType}</p>
                      <p className="text-xs text-muted-foreground/60">{log.entityId?.slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    {log.metadata && (
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-700">View</summary>
                        <pre className="mt-1 overflow-auto rounded-xl bg-secondary/40 p-2 text-xs">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td className="px-6 py-3 text-xs text-muted-foreground">
                    {log.createdAt.toLocaleString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Activity className="mx-auto h-8 w-8 text-primary/25" />
            <p className="mt-3 text-sm text-muted-foreground">No activity logged yet</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} • {totalCount} total actions
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <a
                href={`?page=${currentPage - 1}${action ? `&action=${action}` : ""}${ministryId ? `&ministryId=${ministryId}` : ""}`}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary/35"
              >
                ← Previous
              </a>
            )}
            {currentPage < totalPages && (
              <a
                href={`?page=${currentPage + 1}${action ? `&action=${action}` : ""}${ministryId ? `&ministryId=${ministryId}` : ""}`}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary/35"
              >
                Next →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
