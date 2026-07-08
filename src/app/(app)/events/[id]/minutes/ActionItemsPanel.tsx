"use client";

import { useActionState, useState } from "react";
import { Plus, Edit2, Trash2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { addActionItem, updateActionItem, deleteActionItem, type ActionState } from "./actions";
import { DatePicker } from "@/components/DatePicker";

type Item = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  point: "ACTION_POINT" | "AGREED";
  dueDate: string | null;
  ownerName: string | null;
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
  "w-full rounded-md border border-border bg-input px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1";

const STATUS_LABELS: Record<Item["status"], string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const STATUS_ICON: Record<Item["status"], React.ReactNode> = {
  TODO: <AlertCircle className="h-4 w-4" />,
  IN_PROGRESS: <Clock className="h-4 w-4" />,
  DONE: <CheckCircle2 className="h-4 w-4" />,
};

const STATUS_BADGE: Record<Item["status"], string> = {
  TODO: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  IN_PROGRESS: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  DONE: "bg-green-500/10 text-green-400 border border-green-500/20",
};

const POINT_LABELS: Record<Item["point"], string> = {
  ACTION_POINT: "Action Point",
  AGREED: "Agreed",
};

const POINT_BADGE: Record<Item["point"], string> = {
  ACTION_POINT: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  AGREED: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
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
        <div className="rounded-lg bg-secondary/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">No action items yet.</p>
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) =>
            editingId === item.id ? (
              <div key={item.id} className="rounded-lg border border-border bg-secondary/50 p-4 space-y-3">
                <form action={editAction} className="space-y-3">
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="minutesId" value={minutesId} />
                  <input type="hidden" name="eventId" value={eventId} />

                  {editState?.error ? (
                    <div className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
                      {editState.error}
                    </div>
                  ) : editState?.ok ? (
                    <div className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-400">
                      ✓ Saved.
                    </div>
                  ) : null}

                  <div className="grid gap-3">
                    <select name="point" defaultValue={item.point} className={field}>
                      <option value="ACTION_POINT">Action Point</option>
                      <option value="AGREED">Agreed</option>
                    </select>
                    <input
                      list="ministry-people"
                      name="ownerName"
                      defaultValue={item.ownerName ?? item.owner?.name ?? ""}
                      className={field}
                      placeholder="Responsible party (type a name)"
                    />
                    <datalist id="ministry-people">
                      {users.map((u) => (
                        <option key={u.id} value={userLabel(u)} />
                      ))}
                    </datalist>
                    <DatePicker name="dueDate" defaultValue={item.dueDate ?? ""} placeholder="Timeline" />
                    <input
                      name="title"
                      defaultValue={item.title}
                      required
                      className={field}
                      placeholder="Action point"
                    />
                    <select name="status" defaultValue={item.status} className={field}>
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="DONE">Done</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={editPending}
                      className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {editPending ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded border border-border px-3 py-1.5 text-xs text-foreground hover:bg-secondary transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div
                key={item.id}
                className="rounded-lg border border-border/50 bg-secondary/20 p-4 flex items-start justify-between gap-4 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {STATUS_ICON[item.status]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 font-medium ${POINT_BADGE[item.point]}`}>
                          {POINT_LABELS[item.point]}
                        </span>
                        {(item.ownerName || item.owner) && (
                          <span className="rounded-full bg-sidebar-primary/10 px-2.5 py-1 text-sidebar-primary">
                            {item.ownerName || userLabel(item.owner!)}
                          </span>
                        )}
                        {item.dueDate && (
                          <span className="rounded-full bg-muted/50 px-2.5 py-1 text-muted-foreground">
                            Timeline: {new Date(item.dueDate + "T00:00:00").toLocaleDateString()}
                          </span>
                        )}
                        <span className={`rounded-full px-2.5 py-1 font-medium ${STATUS_BADGE[item.status]}`}>
                          {STATUS_LABELS[item.status]}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {showActions ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(item.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <form action={deleteActionItem} className="inline">
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="minutesId" value={minutesId} />
                      <input type="hidden" name="eventId" value={eventId} />
                      <button
                        type="submit"
                        className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            ),
          )}
        </div>
      ) : null}

      {showActions ? (
        <div>
          {showAdd ? (
            <form action={addAction} className="space-y-3 rounded-lg border border-border bg-secondary/50 p-4">
              <input type="hidden" name="minutesId" value={minutesId} />
              <input type="hidden" name="eventId" value={eventId} />

              {addState?.error ? (
                <div className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
                  {addState.error}
                </div>
              ) : null}

              <select name="point" defaultValue="ACTION_POINT" className={field}>
                <option value="ACTION_POINT">Action Point</option>
                <option value="AGREED">Agreed</option>
              </select>

              <input
                list="ministry-people"
                name="ownerName"
                className={field}
                placeholder="Responsible party (type a name)"
              />
              <datalist id="ministry-people">
                {users.map((u) => (
                  <option key={u.id} value={userLabel(u)} />
                ))}
              </datalist>

              <DatePicker name="dueDate" placeholder="Timeline" />

              <input
                name="title"
                required
                className={field}
                placeholder="Action point"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addPending}
                  className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {addPending ? "Adding…" : "Add item"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="rounded border border-border px-3 py-1.5 text-xs text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
            >
              <Plus size={16} />
              Add action item
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
