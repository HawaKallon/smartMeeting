import { isSuperAdmin } from "@/lib/roles";
import { requireUser } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { Plus, Building2, Check, X } from "lucide-react";
import { CreateMinistryForm } from "./CreateMinistryForm";
import { ToggleMinistryButton } from "./ToggleMinistryButton";
import { AddAdminButton } from "./AddAdminButton";
import { EditMinistryButton } from "./EditMinistryButton";

export default async function AdminMinistriesPage() {
  const user = await requireUser();

  if (!isSuperAdmin(user.systemRole)) {
    return (
      <div className="space-y-6">
        <BackButton href="/administrative" label="Dashboard" />
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
      <BackButton href="/administrative" label="Dashboard" />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Platform administration</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Admin: Manage Ministries</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create and manage ministries</p>
      </div>

      <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[0_18px_45px_rgba(15,35,63,0.08)]">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Plus className="h-5 w-5" />
          Create New Ministry
        </h2>
        <CreateMinistryForm />
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_18px_45px_rgba(15,35,63,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/45">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email Domain</th>
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
                  className={`transition-colors hover:bg-secondary/30 ${idx < ministries.length - 1 ? "border-b border-border/50" : ""}`}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground font-mono text-xs">{m.code}</td>
                  <td className="px-6 py-3 text-muted-foreground font-mono text-xs">
                    {m.emailDomain ? `@${m.emailDomain}` : <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{m._count.users}</td>
                  <td className="px-6 py-3 text-muted-foreground">{m._count.events}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        m.active
                          ? "bg-green-500/10 text-green-600"
                          : "bg-red-500/10 text-red-600"
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
                    <div className="space-y-2">
                      <ToggleMinistryButton ministryId={m.id} isActive={m.active} />
                      <EditMinistryButton
                        ministryId={m.id}
                        name={m.name}
                        emailDomain={m.emailDomain}
                        compoundLat={m.compoundLat}
                        compoundLng={m.compoundLng}
                        compoundGeofenceRadius={m.compoundGeofenceRadius}
                        compoundMaxGpsAccuracy={m.compoundMaxGpsAccuracy}
                      />
                      <AddAdminButton ministryId={m.id} emailDomain={m.emailDomain} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ministries.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Building2 className="mx-auto h-8 w-8 text-primary/25" />
            <p className="mt-3 text-sm text-muted-foreground">No ministries yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
