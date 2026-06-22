import { requireUser, ministryScope } from "@/lib/guard";
import { isSuperAdmin } from "@/lib/roles";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/roles";
import { Shield, Plus, Check, X } from "lucide-react";
import { CreateUserForm } from "./CreateUserForm";
import { UserFilters } from "./UserFilters";
import { UserRowActions } from "./UserRowActions";
import type { Prisma } from "@/generated/prisma/client";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; ministryId?: string }>;
}) {
  const user = await requireUser();

  // Only allow ADMIN and SUPER_ADMIN
  if (user.role !== "ADMIN" && !isSuperAdmin(user.role)) {
    return (
      <div className="space-y-6">
        <BackButton href="/" label="Dashboard" />
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">You don&apos;t have permission to access this page</p>
        </div>
      </div>
    );
  }

  const superAdmin = isSuperAdmin(user.role);
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
    role: { not: "SUPER_ADMIN" },
  };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (role) where.role = role as Prisma.UserWhereInput["role"];
  if (superAdmin && ministryId) where.ministryId = ministryId;

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      ministryId: true,
      ministry: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <BackButton href="/" label="Dashboard" />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin: Manage Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create users and manage roles</p>
      </div>

      {/* Create User Form */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New User
        </h2>
        <CreateUserForm isSuperAdmin={superAdmin} ministries={ministries} />
      </div>

      {/* Filters */}
      <UserFilters ministries={superAdmin ? ministries : undefined} />

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
                {superAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ministry</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr
                  key={u.id}
                  className={`transition-colors hover:bg-muted/30 ${idx < users.length - 1 ? "border-b border-border/50" : ""}`}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
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
                    <span className="rounded-lg bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
                        u.active
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
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
                      role={u.role}
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
            <Shield className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}
