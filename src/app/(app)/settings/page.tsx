import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
import { Bell, Lock, Palette, Database } from "lucide-react";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const user = await requireUser();
  const freshUser = await prisma.user.findUnique({ where: { id: user.id } });

  if (!freshUser) {
    return <div className="text-center text-muted-foreground">User not found</div>;
  }

  return (
    <div className="space-y-6">
      <BackButton href="/administrative" label="Dashboard" />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your application preferences</p>
      </div>

      <SettingsClient user={freshUser} />
    </div>
  );
}
