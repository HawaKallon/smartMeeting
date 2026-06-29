"use client";

import { useState, useRef, useEffect } from "react";
import { useActionState } from "react";
import { Check, X, CalendarRange, ClipboardList, ShieldCheck, BellRing } from "lucide-react";
import { updateProfile } from "./actions";
import type { User } from "@/generated/prisma/client";

const field = "mt-1 w-full rounded-xl border border-border bg-secondary/55 px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

interface ProfileViewProps {
  user: User & { _count?: { organizedEvents: number } };
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  stats: {
    organizedEvents: number;
    attendedEvents: number;
    actionItems: number;
    upcomingEvents: number;
  };
}

export function ProfileView({ user, isEditing, setIsEditing, stats }: ProfileViewProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, undefined);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok && isEditing) {
      setIsEditing(false);
    }
  }, [state?.ok, isEditing, setIsEditing]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPreviewImage(null);
    setShowPassword(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (isEditing) {
    return (
      <form action={formAction} className="space-y-6">
        {state?.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
        )}

        {/* Profile Section */}
        <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Edit Profile</h2>

          <div className="space-y-4">
            <div>
              <label className={label}>Profile Picture</label>
              <div className="mt-2 flex gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white flex-shrink-0 overflow-hidden">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="h-full w-full object-cover" />
                  ) : user.image ? (
                    <img src={user.image} alt={user.name || "Avatar"} className="h-full w-full object-cover" />
                  ) : (
                    (user.name ?? user.email).charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="image"
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#002a68]"
                  >
                    Upload Image
                  </button>
                  <p className="text-xs text-muted-foreground">PNG, JPG, or WebP • Max 5MB</p>
                </div>
              </div>
            </div>

            <div>
              <label className={label}>Full Name</label>
              <input
                type="text"
                name="name"
                required
                defaultValue={user.name || ""}
                className={field}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className={label}>Phone Number</label>
              <input
                type="tel"
                name="phone"
                defaultValue={user.phone || ""}
                className={field}
                placeholder="e.g. +232 76 123456 (for SMS notifications)"
              />
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Preferences</h3>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="emailNotifications"
                  defaultChecked={true}
                  className="h-4 w-4 rounded border-border bg-muted accent-foreground"
                />
                <span className="text-sm text-foreground">Receive email notifications for invitations</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="minutesNotifications"
                  defaultChecked={true}
                  className="h-4 w-4 rounded border-border bg-muted accent-foreground"
                />
                <span className="text-sm text-foreground">Receive email when minutes are published</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="actionItemNotifications"
                  defaultChecked={true}
                  className="h-4 w-4 rounded border-border bg-muted accent-foreground"
                />
                <span className="text-sm text-foreground">Receive notifications for assigned action items</span>
              </label>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Security</h3>

          <div className="space-y-4">
            <div>
              <label className={label}>Current Password</label>
              <input
                type={showPassword ? "text" : "password"}
                name="currentPassword"
                className={field}
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <label className={label}>New Password (optional)</label>
              <input
                type={showPassword ? "text" : "password"}
                name="newPassword"
                className={field}
                placeholder="Leave blank to keep current password"
              />
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-muted accent-foreground"
                />
                <span className="text-sm text-foreground">Show passwords</span>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#002a68] disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[1.9rem] border border-[#cfe0f3] bg-card shadow-[0_18px_45px_rgba(15,35,63,0.08)]">
          <div className="bg-[linear-gradient(135deg,#003580_0%,#0a4aa7_55%,#1c63cb_100%)] px-7 py-7 text-white">
            <div className="flex items-start gap-5">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/25 bg-white/15 text-2xl font-bold text-white backdrop-blur flex-shrink-0">
                {user.image ? (
                  <img src={user.image} alt={user.name || "Avatar"} className="h-full w-full object-cover" />
                ) : (
                  (user.name ?? user.email).charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Official profile</p>
                <h2 className="mt-2 text-3xl font-bold">{user.name || "No name set"}</h2>
                <p className="mt-2 text-sm text-white/80">{user.email}</p>
                <div className="mt-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white">
                  {user.role.replace(/_/g, " ")}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-7 sm:grid-cols-2">
            <InfoBlock label="Phone number" value={user.phone || "Not added"} />
            <InfoBlock
              label="Member since"
              value={user.createdAt.toLocaleDateString("en-GB", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
            <InfoBlock
              label="Last updated"
              value={user.updatedAt.toLocaleDateString("en-GB", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            />
            <InfoBlock label="Account status" value="Active" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[0_18px_45px_rgba(15,35,63,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Account overview</p>
            <div className="mt-5 space-y-4">
              <StatusRow
                icon={ShieldCheck}
                title="Secure access"
                description="Profile and password changes are managed from this account."
                accent="blue"
              />
              <StatusRow
                icon={BellRing}
                title="Meeting notifications"
                description="Invitation, minutes, and task update alerts remain enabled for this account."
                accent="green"
              />
              <StatusRow
                icon={CalendarRange}
                title="Participation"
                description="Upcoming meetings and attendance activity are reflected in your statistics below."
                accent="gold"
              />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[0_18px_45px_rgba(15,35,63,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#003580]">Quick summary</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SummaryPill label="Organized" value={stats.organizedEvents} />
              <SummaryPill label="Attended" value={stats.attendedEvents} />
              <SummaryPill label="Tasks" value={stats.actionItems} />
              <SummaryPill label="Upcoming" value={stats.upcomingEvents} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatMiniCard label="Events Organized" value={stats.organizedEvents} tone="blue" icon={CalendarRange} />
        <StatMiniCard label="Events Attended" value={stats.attendedEvents} tone="slate" icon={Check} />
        <StatMiniCard label="Action Items" value={stats.actionItems} tone="green" icon={ClipboardList} />
        <StatMiniCard label="Upcoming Events" value={stats.upcomingEvents} tone="gold" icon={BellRing} />
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-border bg-secondary/40 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  title,
  description,
  accent,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  accent: "blue" | "green" | "gold";
}) {
  const tone = {
    blue: "bg-[#e7f0ff] text-[#003580]",
    green: "bg-[#e6f6ec] text-[#007236]",
    gold: "bg-[#fff4d6] text-[#946200]",
  }[accent];

  return (
    <div className="flex gap-4 rounded-[1.3rem] border border-border bg-secondary/35 p-4">
      <span className={`flex h-11 w-11 items-center justify-center rounded-[1rem] ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.15rem] border border-border bg-secondary/35 px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#003580]">{value}</p>
    </div>
  );
}

function StatMiniCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "blue" | "slate" | "green" | "gold";
  icon: typeof CalendarRange;
}) {
  const styles = {
    blue: "border-[#d3e0f0] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] text-[#003580]",
    slate: "border-[#d6dfec] bg-[linear-gradient(180deg,#fbfdff_0%,#f1f5fb_100%)] text-[#1f3d67]",
    green: "border-[#c7e2d0] bg-[linear-gradient(180deg,#f8fffb_0%,#edf8f1_100%)] text-[#007236]",
    gold: "border-[#f0dfaa] bg-[linear-gradient(180deg,#fffef8_0%,#fff5d9_100%)] text-[#946200]",
  }[tone];

  return (
    <div className={`rounded-[1.55rem] border p-5 shadow-[0_14px_35px_rgba(15,35,63,0.07)] ${styles}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="mt-5 text-3xl font-semibold">{value}</p>
    </div>
  );
}
