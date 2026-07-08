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
  canMoveAny: boolean;
  currentUserId: string;
  ownerFilter: string;
}

const COLUMNS: { id: Status; label: string }[] = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "DONE", label: "Done" },
];

const COLUMN_STYLES: Record<Status, { badge: string; text: string }> = {
  TODO: {
    badge: "bg-secondary text-muted-foreground",
    text: "text-muted-foreground",
  },
  IN_PROGRESS: {
    badge: "bg-secondary text-muted-foreground",
    text: "text-muted-foreground",
  },
  DONE: {
    badge: "bg-secondary text-muted-foreground",
    text: "text-muted-foreground",
  },
};

export function KanbanBoard({ items: initial, canMoveAny, currentUserId, ownerFilter }: Props) {
  const [items, setItems] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const visible = ownerFilter === "all"
    ? items
    : items.filter((i) => i.ownerName !== null);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colItems = visible.filter((i) => i.status === col.id);
          return (
            <Column key={col.id} id={col.id} label={col.label} count={colItems.length}>
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

function Column({
  id, label, count, children,
}: {
  id: Status; label: string; count: number; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const styles = COLUMN_STYLES[id];

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border transition-colors ${
        isOver ? "border-primary ring-2 ring-primary/10 bg-secondary/20" : "border-border bg-card"
      }`}
    >
      <div className="border-b border-border bg-secondary/40 px-4 py-3 rounded-t-xl">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${styles.text}`}>{label}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}>
            {count}
          </span>
        </div>
      </div>
      <div className="flex min-h-[200px] flex-1 flex-col gap-3 p-3">
        {children}
      </div>
    </div>
  );
}

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

function CardView({
  item, draggable = true, isDragging = false,
}: {
  item: Item; draggable?: boolean; isDragging?: boolean;
}) {
  const isOverdue =
    item.dueDate && item.status !== "DONE" && new Date(item.dueDate) < new Date();

  return (
    <div
      className={`rounded-lg border border-border bg-card p-3 transition-all ${
        isDragging ? "rotate-1 shadow-md" : draggable ? "cursor-grab hover:shadow-sm" : "cursor-default"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-foreground">{item.title}</p>
        {item.dueDate && (
          <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold flex-shrink-0 ${isOverdue ? "bg-red-100 text-red-700" : "bg-secondary text-muted-foreground"}`}>
            {new Date(item.dueDate + "T00:00:00").toLocaleDateString("en-GB", {
              day: "numeric", month: "short",
            })}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{item.eventTitle}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        {item.ownerName && (
          <span className="text-xs text-muted-foreground truncate">{item.ownerName}</span>
        )}
        {isOverdue && <span className="text-xs font-semibold text-red-600 flex-shrink-0">Overdue</span>}
      </div>
    </div>
  );
}
