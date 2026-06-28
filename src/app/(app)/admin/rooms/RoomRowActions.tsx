"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Edit } from "lucide-react";
import { updateRoom, deleteRoom } from "./actions";

const field = "rounded-lg border border-border bg-muted/50 px-2 py-1 text-xs text-foreground focus:border-ring focus:outline-none";

export function RoomRowActions({
  roomId,
  roomName,
}: {
  roomId: string;
  roomName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    location: string;
    capacity: string;
    amenities: string;
    latitude: string;
    longitude: string;
  } | null>(null);

  async function run(fn: () => Promise<{ ok?: boolean; error?: string }>) {
    setPending(true);
    const result = await fn();
    setPending(false);
    if (result?.error) {
      alert("Error: " + result.error);
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleDelete() {
    if (confirm(`Delete room "${roomName}"? This cannot be undone.`)) {
      await run(() => deleteRoom(roomId));
    }
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editFormData) return;

    const formData = new FormData();
    formData.append("name", editFormData.name);
    formData.append("location", editFormData.location);
    formData.append("capacity", editFormData.capacity);
    formData.append("amenities", editFormData.amenities);
    formData.append("latitude", editFormData.latitude);
    formData.append("longitude", editFormData.longitude);

    const ok = await run(() => updateRoom(roomId, undefined, formData));
    if (ok) {
      setIsEditOpen(false);
      setEditFormData(null);
    }
  }

  return (
    <div className="flex items-center gap-1">
      {isEditOpen && editFormData ? (
        <form onSubmit={handleEditSubmit} className="space-y-2 w-80">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              placeholder="Room name"
              className={field}
              required
            />
            <input
              type="text"
              value={editFormData.location}
              onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
              placeholder="Location"
              className={field}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              value={editFormData.capacity}
              onChange={(e) => setEditFormData({ ...editFormData, capacity: e.target.value })}
              placeholder="Capacity"
              className={field}
              required
              min="1"
            />
            <input
              type="number"
              step="any"
              value={editFormData.latitude}
              onChange={(e) => setEditFormData({ ...editFormData, latitude: e.target.value })}
              placeholder="Lat"
              className={field}
            />
            <input
              type="number"
              step="any"
              value={editFormData.longitude}
              onChange={(e) => setEditFormData({ ...editFormData, longitude: e.target.value })}
              placeholder="Long"
              className={field}
            />
          </div>
          <input
            type="text"
            value={editFormData.amenities}
            onChange={(e) => setEditFormData({ ...editFormData, amenities: e.target.value })}
            placeholder="Amenities (comma-separated)"
            className={field}
          />
          <div className="flex gap-1">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-green-500/10 px-2 py-1 text-xs text-green-400 hover:bg-green-500/20 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditOpen(false);
                setEditFormData(null);
              }}
              className="flex-1 rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/70"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => setIsEditOpen(true)}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            title="Edit room"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleDelete}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:text-red-400 hover:bg-muted disabled:opacity-50"
            title="Delete room"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
