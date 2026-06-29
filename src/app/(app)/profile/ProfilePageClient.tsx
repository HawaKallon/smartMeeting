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
      <BackButton href="/administrative" label="Dashboard" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Personal account</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">View and manage your account</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#002a68]"
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
