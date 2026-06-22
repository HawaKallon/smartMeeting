import { isSuperAdmin } from "@/lib/roles";
import { requireUser } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { Plus, Building2, Check, X } from "lucide-react";
import { CreateMinistryForm } from "./CreateMinistryForm";
import { ToggleMinistryButton } from "./ToggleMinistryButton";

export default async function AdminMinistriesPage() {
  const user = await requireUser();

  if (!isSuperAdmin(user.role)) {
    return (
      <div className="space-y-6">
        <BackButton href="/" label="Dashboard" />
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">Only super-admins can access this page</p>
        </div>
      </div>
    );
  }

  const ministries = await prisma.ministry.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: { _count: { select: { users: true, events: true } } },
  });

  return (
    <div className="space-y-6">
      <BackButton href="/" label="Dashboard" />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin: Manage Ministries</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create and manage ministries</p>
      </div>

      {/* Create Ministry Form */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Ministry
        </h2>
        <CreateMinistryForm />
      </div>

      {/* Ministries Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Users</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Events</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ministries.map((m, idx) => (
                <tr
                  key={m.id}
                  className={`transition-colors hover:bg-muted/30 ${idx < ministries.length - 1 ? "border-b border-border/50" : ""}`}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground font-mono text-xs">{m.code}</td>
                  <td className="px-6 py-3 text-muted-foreground">{m._count.users}</td>
                  <td className="px-6 py-3 text-muted-foreground">{m._count.events}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
                        m.active
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {m.active ? (
                        <>
                          <Check className="h-3 w-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3" />
                          Inactive
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground text-xs">
                    {m.createdAt.toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-6 py-3">
                    <ToggleMinistryButton ministryId={m.id} isActive={m.active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ministries.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">No ministries yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
