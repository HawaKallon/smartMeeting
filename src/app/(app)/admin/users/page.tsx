import { ministryScope, requireAdminRole } from "@/lib/guard";
import { isSuperAdmin } from "@/lib/roles";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { SYSTEM_ROLE_LABELS } from "@/lib/roles";
import { Shield, Plus, Check, X } from "lucide-react";
import { CreateUserForm } from "./CreateUserForm";
import { UserFilters } from "./UserFilters";
import { UserRowActions } from "./UserRowActions";
import type { Prisma } from "@/generated/prisma/client";
import type { SystemRole } from "@/generated/prisma/enums";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; ministryId?: string }>;
}) {
  const user = await requireAdminRole();

  const superAdmin = isSuperAdmin(user.systemRole);
  const { q, role, ministryId } = await searchParams;

  // Super-admins can target any ministry; surface the list for the create form + filter.
  const ministries = superAdmin
    ? await prisma.ministry.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, emailDomain: true },
      })
    : [];

  // Super-admins are platform-wide and never belong to a ministry's user list.
  const where: Prisma.UserWhereInput = {
    ...ministryScope(user),
    systemRole: { not: "SUPER_ADMIN" },
  };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (role) where.systemRole = role as Prisma.UserWhereInput["systemRole"];
  if (superAdmin && ministryId) where.ministryId = ministryId;

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    select: { id: true,
      name: true,
      email: true,
      systemRole: true,
      jobTitle: true,
      active: true,
      createdAt: true,
      ministryId: true,
      ministry: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <BackButton href="/administrative" label="Dashboard" />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Platform administration</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Admin: Manage Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create users and manage roles</p>
      </div>

      <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[0_18px_45px_rgba(15,35,63,0.08)]">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Plus className="h-5 w-5" />
          Create New User
        </h2>
        <CreateUserForm isSuperAdmin={superAdmin} ministries={ministries} />
      </div>

      {/* Filters */}
      <UserFilters ministries={superAdmin ? ministries : undefined} />

      <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_18px_45px_rgba(15,35,63,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/45">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
                {superAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ministry</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job Title</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr
                  key={u.id}
                  className={`transition-colors hover:bg-secondary/30 ${idx < users.length - 1 ? "border-b border-border/50" : ""}`}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {(u.name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{u.name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{u.email}</td>
                  {superAdmin && (
                    <td className="px-6 py-3 text-muted-foreground">{u.ministry?.name ?? "—"}</td>
                  )}
                  <td className="px-6 py-3">
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600">
                      {SYSTEM_ROLE_LABELS[u.systemRole as SystemRole] || "Unknown"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{u.jobTitle || "—"}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        u.active
                          ? "bg-green-500/10 text-green-600"
                          : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {u.active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <UserRowActions
                      userId={u.id}
                      userName={u.name || u.email}
                      role={u.systemRole as SystemRole}
                      active={u.active}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Shield className="mx-auto h-8 w-8 text-primary/25" />
            <p className="mt-3 text-sm text-muted-foreground">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}
