"use client";

import { useState, useRef, useEffect } from "react";
import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { updateProfile } from "./actions";
import type { User } from "@/generated/prisma/client";

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
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

  // Auto-close edit mode after successful save
  if (state?.ok && isEditing) {
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <form action={formAction} className="space-y-6">
        {state?.error && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{state.error}</div>
        )}

        {/* Profile Section */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Edit Profile</h2>

          <div className="space-y-4">
            <div>
              <label className={label}>Profile Picture</label>
              <div className="mt-2 flex gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-foreground text-2xl font-bold text-background flex-shrink-0 overflow-hidden">
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
                    className="px-3 py-1 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
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
        <div className="rounded-xl border border-border bg-card p-6">
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
        <div className="rounded-xl border border-border bg-card p-6">
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-muted/30 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 transition-colors"
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
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-xl font-bold text-background flex-shrink-0 overflow-hidden">
            {user.image ? (
              <img src={user.image} alt={user.name || "Avatar"} className="h-full w-full object-cover" />
            ) : (
              (user.name ?? user.email).charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">{user.name || "No name set"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Account Information</h3>
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{user.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Member Since</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {user.createdAt.toLocaleDateString("en-GB", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Activity Statistics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Events Organized</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.organizedEvents}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Events Attended</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.attendedEvents}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Action Items</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.actionItems}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Upcoming Events</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.upcomingEvents}</p>
        </div>
      </div>

      {/* Quick Info */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Info</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground mb-1">Account Status</p>
            <p className="text-sm text-green-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-400"></span>
              Active
            </p>
          </div>
          <div className="rounded-lg bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground mb-1">Role</p>
            <p className="text-sm text-foreground capitalize">{user.role.replace(/_/g, " ").toLowerCase()}</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground mb-1">Profile Completeness</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: user.image ? "100%" : "75%" }}></div>
              </div>
              <span className="text-xs text-muted-foreground">{user.image ? "100%" : "75%"}</span>
            </div>
          </div>
          <div className="rounded-lg bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground mb-1">Last Updated</p>
            <p className="text-sm text-muted-foreground">
              {user.updatedAt.toLocaleDateString("en-GB", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
