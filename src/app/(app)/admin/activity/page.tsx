import { requireUser } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { Activity, Filter } from "lucide-react";

export default async function ActivityLogPage() {
  const user = await requireUser();

  // Only ADMIN can view activity log
  if (user.role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <BackButton href="/" label="Dashboard" />
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">You don't have permission to access this page</p>
        </div>
      </div>
    );
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  });

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
          <p className="mt-2 text-2xl font-bold text-foreground">{logs.length}</p>
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

      {/* Activity Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">User</th>
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
    </div>
  );
}
