import { requireUser } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { ROLE_LABELS } from "@/lib/roles";
import { Mail, Shield, Calendar } from "lucide-react";
import { EditProfileForm } from "./EditProfileForm";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <BackButton href="/" label="Dashboard" />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">View and manage your account</p>
      </div>

      {/* Main profile card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-xl font-bold text-background flex-shrink-0">
            {(user.name ?? user.email).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">{user.name || "No name set"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Account Information</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Member Since</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {new Date().toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Edit Profile</h3>
        <EditProfileForm initialName={user.name || ""} />
      </div>

      {/* Settings sections */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground">Preferences</h3>
          <p className="mt-1 text-sm text-muted-foreground">Manage your notification and privacy settings</p>
          <button className="mt-4 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors">
            Configure
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground">Security</h3>
          <p className="mt-1 text-sm text-muted-foreground">Update your password and security settings</p>
          <button className="mt-4 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors">
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
