"use client";

import { useState } from "react";
import { toggleMinistryActive } from "./actions";

export function ToggleMinistryButton({
  ministryId,
  isActive,
}: {
  ministryId: string;
  isActive: boolean;
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    if (!confirm(`${isActive ? "Deactivate" : "Activate"} this ministry?`)) return;

    setIsPending(true);
    setError(null);

    const result = await toggleMinistryActive(ministryId, !isActive);

    setIsPending(false);
    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <>
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`text-xs px-2 py-1 rounded transition-colors ${
          isActive
            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
            : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
        } disabled:opacity-50`}
      >
        {isPending ? "..." : isActive ? "Deactivate" : "Activate"}
      </button>
    </>
  );
}
