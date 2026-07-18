"use client";

import { useActionState } from "react";
import { Bell, Lock, Monitor, Database } from "lucide-react";
import { updateAllSettings } from "./actions";
import { useActionMessage } from "@/hooks/useActionMessage";
import type { User } from "@/generated/prisma/client";

interface SettingsClientProps {
  user: User;
}

function ToggleSwitch({
  name,
  defaultChecked,
  disabled,
}: {
  name: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-sidebar-primary transition-colors peer-disabled:opacity-50"></div>
      <span className="absolute left-1 top-0.5 h-5 w-5 bg-card rounded-full peer-checked:translate-x-5 transition-transform peer-disabled:opacity-50"></span>
    </label>
  );
}

export function SettingsClient({ user }: SettingsClientProps) {
  const [state, formAction, isPending] = useActionState(updateAllSettings, undefined);
  const messageVisible = useActionMessage(state);

  return (
    <form action={formAction} className="space-y-6">
      {messageVisible && state?.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}
      {messageVisible && state?.ok && !state?.error && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          All settings updated successfully!
        </div>
      )}

      <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,53,128,0.08)]">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Bell className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Email Notifications</p>
              <p className="text-xs text-muted-foreground">
                Receive notifications about events and invitations
              </p>
            </div>
            <ToggleSwitch
              name="emailNotifications"
              defaultChecked={user.emailNotifications}
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Meeting Reminders</p>
              <p className="text-xs text-muted-foreground">Get reminders before upcoming meetings</p>
            </div>
            <ToggleSwitch
              name="meetingReminders"
              defaultChecked={user.meetingReminders}
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Action Item Updates</p>
              <p className="text-xs text-muted-foreground">
                Be notified when action items are assigned or updated
              </p>
            </div>
            <ToggleSwitch
              name="actionItemNotifications"
              defaultChecked={user.actionItemNotifications}
              disabled={isPending}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,53,128,0.08)]">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Monitor className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold text-foreground">Display</h2>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#dfe8f2] bg-[#f9fbfe] px-4 py-3">
            <p className="text-sm font-medium text-foreground">Theme</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The ministry workspace now uses the standard light interface across all sections.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Compact Mode</p>
              <p className="text-xs text-muted-foreground">Use a more compact layout</p>
            </div>
            <ToggleSwitch
              name="compactMode"
              defaultChecked={user.compactMode}
              disabled={isPending}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,53,128,0.08)]">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Lock className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold text-foreground">Privacy & Security</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-border bg-muted/30 text-foreground text-sm font-medium hover:bg-muted transition-colors cursor-not-allowed opacity-50"
              disabled
            >
              Coming Soon
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Session Timeout</p>
              <p className="text-xs text-muted-foreground">Auto-logout after inactivity</p>
            </div>
            <select
              name="sessionTimeout"
              defaultValue={(user.sessionTimeout ?? 30).toString()}
              disabled={isPending}
              className="px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground text-sm hover:bg-muted/70 transition-colors cursor-pointer disabled:opacity-50"
            >
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="-1">Never</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,53,128,0.08)]">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Database className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold text-foreground">Data & Storage</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-delete old recordings</p>
              <p className="text-xs text-muted-foreground">Automatically remove recordings after 90 days</p>
            </div>
            <ToggleSwitch
              name="autoDeleteRecordings"
              defaultChecked={user.autoDeleteRecordings}
              disabled={isPending}
            />
          </div>

          <button
            type="button"
            className="w-full px-4 py-2 rounded-lg border border-border bg-muted/30 text-foreground text-sm font-medium hover:bg-muted transition-colors cursor-not-allowed opacity-50"
            disabled
          >
            Download Your Data (Coming Soon)
          </button>
        </div>
      </div>

      {/* Single Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(0,53,128,0.18)] transition hover:bg-[#002c6b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save All Settings"}
        </button>
      </div>
    </form>
  );
}
