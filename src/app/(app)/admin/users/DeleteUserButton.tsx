"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteUser } from "./actions";

export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleDelete() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setIsDeleting(true);
    const result = await deleteUser(userId);
    setIsDeleting(false);

    if (result.ok) {
      // Reload the page to refresh the user list
      window.location.reload();
    } else {
      alert("Error: " + (result.error || "Failed to delete user"));
      setConfirmed(false);
    }
  }

  if (confirmed) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Confirm"}
        </button>
        <button
          onClick={() => setConfirmed(false)}
          disabled={isDeleting}
          className="px-2 py-1 text-xs bg-muted text-muted-foreground hover:bg-muted/80 rounded transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleDelete}
      className="text-red-400 hover:text-red-300 transition-colors"
      title={`Delete ${userName}`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
