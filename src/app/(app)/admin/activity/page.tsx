import { requireUser, ministryScope } from "@/lib/guard";
import { isSuperAdmin } from "@/lib/roles";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { Activity, Filter } from "lucide-react";

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
        <BackButton href="/" label="Dashboard" />
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

  return (
    <div className="space-y-6">
      <BackButton href="/" label="Dashboard" />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track all system actions and changes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Actions</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{totalCount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Today</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {logs.filter((l) => {
              const today = new Date();
              return l.createdAt.toDateString() === today.toDateString();
            }).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Users Active</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {new Set(logs.map((l) => l.actorId)).size}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-foreground">Filter by action:</label>
        <select
          onChange={(e) => {
            const url = new URL(window.location.href);
            if (e.target.value) {
              url.searchParams.set("action", e.target.value);
              url.searchParams.delete("page");
            } else {
              url.searchParams.delete("action");
            }
            window.location.href = url.toString();
          }}
          defaultValue={action ?? ""}
          className="px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground text-sm hover:bg-muted/70 transition-colors cursor-pointer"
        >
          <option value="">All actions</option>
          {uniqueActions.map((a) => (
            <option key={a.action} value={a.action}>
              {a.action.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        {superAdmin && (
          <>
            <label className="text-sm font-medium text-foreground">Filter by ministry:</label>
            <select
              onChange={(e) => {
                const url = new URL(window.location.href);
                if (e.target.value) {
                  url.searchParams.set("ministryId", e.target.value);
                  url.searchParams.delete("page");
                } else {
                  url.searchParams.delete("ministryId");
                }
                window.location.href = url.toString();
              }}
              defaultValue={ministryId ?? ""}
              className="px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground text-sm hover:bg-muted/70 transition-colors cursor-pointer"
            >
              <option value="">All ministries</option>
              {ministries.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Activity Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
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
                  className={`transition-colors hover:bg-muted/30 ${idx < logs.length - 1 ? "border-b border-border/50" : ""}`}
                >
                  <td className="px-6 py-3">
                    <span className="rounded-lg bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
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
                        <summary className="text-blue-400 hover:text-blue-300">View</summary>
                        <pre className="mt-1 overflow-auto rounded bg-muted/30 p-2 text-xs">
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
            <Activity className="mx-auto h-8 w-8 text-muted-foreground/30" />
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
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                ← Previous
              </a>
            )}
            {currentPage < totalPages && (
              <a
                href={`?page=${currentPage + 1}${action ? `&action=${action}` : ""}${ministryId ? `&ministryId=${ministryId}` : ""}`}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
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
