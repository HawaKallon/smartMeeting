"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { Pencil } from "lucide-react";
import { ProfileView } from "./ProfileView";
import type { User } from "@/generated/prisma/client";

interface ProfilePageClientProps {
  user: User;
  stats: {
    organizedEvents: number;
    attendedEvents: number;
    actionItems: number;
    upcomingEvents: number;
  };
}

export function ProfilePageClient({ user, stats }: ProfilePageClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  const handleSetIsEditing = (editing: boolean) => {
    setIsEditing(editing);
    if (!editing) {
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <BackButton href="/" label="Dashboard" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">View and manage your account</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit Profile
          </button>
        )}
      </div>

      <ProfileView user={user} isEditing={isEditing} setIsEditing={handleSetIsEditing} stats={stats} />
    </div>
  );
}
