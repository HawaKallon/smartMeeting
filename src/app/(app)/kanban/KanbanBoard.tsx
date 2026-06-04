"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { changeItemStatus } from "./actions";

type Status = "TODO" | "IN_PROGRESS" | "DONE";

type Item = {
  id: string;
  title: string;
  status: Status;
  dueDate: string | null;
  eventTitle: string;
  ownerName: string | null;
};

interface Props {
  items: Item[];
  canMoveAny: boolean; // staff can move any card; others only their own
  currentUserId: string;
  ownerFilter: string; // userId to filter by, or "all"
}

const COLUMNS: { id: Status; label: string; color: string }[] = [
  { id: "TODO",        label: "To Do",       color: "bg-gray-100" },
  { id: "IN_PROGRESS", label: "In Progress",  color: "bg-blue-50" },
  { id: "DONE",        label: "Done",         color: "bg-green-50" },
];

const STATUS_BADGE: Record<Status, string> = {
  TODO:        "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE:        "bg-green-100 text-green-700",
};

export function KanbanBoard({ items: initial, canMoveAny, currentUserId, ownerFilter }: Props) {
  const [items, setItems] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const visible = ownerFilter === "all"
    ? items
    : items.filter((i) => i.ownerName !== null); // already pre-filtered server-side

  const activeItem = activeId ? items.find((i) => i.id === activeId) ?? null : null;

  function canDrag(item: Item) {
    return canMoveAny || item.ownerName !== null;
  }

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;

    const newStatus = String(over.id) as Status;
    const item = items.find((i) => i.id === active.id);
    if (!item || item.status === newStatus) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)),
    );

    const fd = new FormData();
    fd.set("itemId", item.id);
    fd.set("status", newStatus);
    startTransition(() => { changeItemStatus(fd); });
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colItems = visible.filter((i) => i.status === col.id);
          return (
            <Column key={col.id} id={col.id} label={col.label} color={col.color} count={colItems.length}>
              {colItems.map((item) => (
                <Card key={item.id} item={item} draggable={canDrag(item)} isActive={item.id === activeId} />
              ))}
            </Column>
          );
        })}
      </div>

      <DragOverlay>
        {activeItem ? <CardView item={activeItem} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// ── Column ───────────────────────────────────────────────────────────────────

function Column({
  id, label, color, count, children,
}: {
  id: Status; label: string; color: string; count: number; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 flex-shrink-0 flex-col rounded-xl border-2 transition-colors ${
        isOver ? "border-gray-400 bg-gray-50" : "border-transparent"
      }`}
    >
      <div className={`rounded-t-xl px-4 py-3 ${color}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
            {count}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}

// ── Card (draggable wrapper) ─────────────────────────────────────────────────

function Card({ item, draggable, isActive }: { item: Item; draggable: boolean; isActive: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    disabled: !draggable,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      className={isActive ? "opacity-40" : ""}
    >
      <CardView item={item} draggable={draggable} />
    </div>
  );
}

// ── Card visual ───────────────────────────────────────────────────────────────

function CardView({
  item, draggable = true, isDragging = false,
}: {
  item: Item; draggable?: boolean; isDragging?: boolean;
}) {
  const isOverdue =
    item.dueDate && item.status !== "DONE" && new Date(item.dueDate) < new Date();

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow ${
        isDragging ? "shadow-lg rotate-1" : draggable ? "cursor-grab hover:shadow-md" : "cursor-default"
      }`}
    >
      <p className="text-sm font-medium text-gray-900 leading-snug">{item.title}</p>
      <p className="mt-1 text-xs text-gray-400">{item.eventTitle}</p>
      <div className="mt-2 flex items-center justify-between">
        {item.ownerName && (
          <span className="text-xs text-gray-500">{item.ownerName}</span>
        )}
        {item.dueDate && (
          <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-gray-400"}`}>
            {isOverdue ? "Overdue · " : ""}
            {new Date(item.dueDate + "T00:00:00").toLocaleDateString("en-GB", {
              day: "numeric", month: "short",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
