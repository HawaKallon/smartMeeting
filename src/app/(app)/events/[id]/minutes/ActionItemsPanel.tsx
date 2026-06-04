"use client";

import { useActionState, useState } from "react";
import { addActionItem, updateActionItem, deleteActionItem, type ActionState } from "./actions";

type Item = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate: string | null;
  owner: { id: string; name: string | null; email: string } | null;
};

type User = { id: string; name: string | null; email: string };

interface Props {
  minutesId: string;
  eventId: string;
  items: Item[];
  users: User[];
  published: boolean;
  canEdit: boolean;
}

const field =
  "w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none";

const STATUS_LABELS: Record<Item["status"], string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const STATUS_BADGE: Record<Item["status"], string> = {
  TODO: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
};

function userLabel(u: User) {
  return u.name ?? u.email;
}

export function ActionItemsPanel({ minutesId, eventId, items, users, published, canEdit }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [addState, addAction, addPending] = useActionState<ActionState, FormData>(
    addActionItem,
    undefined,
  );

  const [editState, editAction, editPending] = useActionState<ActionState, FormData>(
    updateActionItem,
    undefined,
  );

  const showActions = canEdit && !published;

  return (
    <div className="space-y-4">
      {items.length === 0 && !showAdd ? (
        <p className="text-sm text-gray-500">No action items yet.</p>
      ) : items.length > 0 ? (
        <table className="w-full overflow-hidden rounded-lg border text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2">Status</th>
              {showActions ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) =>
              editingId === item.id ? (
                <tr key={item.id}>
                  <td colSpan={showActions ? 5 : 4} className="px-3 py-3">
                    <form action={editAction} className="space-y-3">
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="minutesId" value={minutesId} />
                      <input type="hidden" name="eventId" value={eventId} />

                      {editState?.error ? (
                        <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                          {editState.error}
                        </p>
                      ) : editState?.ok ? (
                        <p className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">
                          Saved.
                        </p>
                      ) : null}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <input
                            name="title"
                            defaultValue={item.title}
                            required
                            className={field}
                            placeholder="Action item title"
                          />
                        </div>
                        <div>
                          <select
                            name="ownerId"
                            defaultValue={item.owner?.id ?? ""}
                            className={field}
                          >
                            <option value="">No owner</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {userLabel(u)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            name="dueDate"
                            type="date"
                            defaultValue={item.dueDate ?? ""}
                            className={field}
                          />
                        </div>
                        <div>
                          <select name="status" defaultValue={item.status} className={field}>
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={editPending}
                          className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                          {editPending ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded border px-3 py-1.5 text-xs hover:bg-gray-50"
                        >
                          Close
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={item.id}>
                  <td className="px-3 py-2">{item.title}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {item.owner ? userLabel(item.owner) : "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {item.dueDate
                      ? new Date(item.dueDate + "T00:00:00").toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[item.status]}`}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  {showActions ? (
                    <td className="px-3 py-2">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingId(item.id)}
                          className="text-xs text-gray-500 hover:text-gray-900"
                        >
                          Edit
                        </button>
                        <form action={deleteActionItem}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="minutesId" value={minutesId} />
                          <input type="hidden" name="eventId" value={eventId} />
                          <button
                            type="submit"
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ),
            )}
          </tbody>
        </table>
      ) : null}

      {showActions ? (
        <div>
          {showAdd ? (
            <form action={addAction} className="space-y-3 rounded-lg border p-4">
              <input type="hidden" name="minutesId" value={minutesId} />
              <input type="hidden" name="eventId" value={eventId} />

              {addState?.error ? (
                <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                  {addState.error}
                </p>
              ) : null}

              <div>
                <input
                  name="title"
                  required
                  className={field}
                  placeholder="Action item title"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select name="ownerId" defaultValue="" className={field}>
                  <option value="">No owner</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {userLabel(u)}
                    </option>
                  ))}
                </select>
                <input name="dueDate" type="date" className={field} />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addPending}
                  className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {addPending ? "Adding…" : "Add item"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="rounded border px-3 py-1.5 text-xs hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              + Add action item
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
