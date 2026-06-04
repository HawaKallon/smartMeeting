import { requireUser } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/roles";
import { Mail, Shield, Plus, Trash2 } from "lucide-react";
import { CreateUserForm } from "./CreateUserForm";

export default async function AdminUsersPage() {
  const user = await requireUser();

  // Only allow superadmin
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

  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return (
    <div className="space-y-6">
      <BackButton href="/" label="Dashboard" />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin: Manage Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create users and manage roles</p>
      </div>

      {/* Create User Form */}
      <div className="rounded-xl border border-border bg-card p-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New User
        </h2>
        <CreateUserForm />
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</th>
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
                  <td className="px-6 py-3">
                    <span className="rounded-lg bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground text-xs">
                    {u.createdAt.toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-6 py-3">
                    <button className="text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
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
