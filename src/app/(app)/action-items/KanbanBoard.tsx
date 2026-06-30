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

const COLUMNS: { id: Status; label: string; color: string }[] = [
  { id: "TODO", label: "To Do", color: "bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)]" },
  { id: "IN_PROGRESS", label: "In Progress", color: "bg-[linear-gradient(180deg,#fffdf8_0%,#fff4d6_100%)]" },
  { id: "DONE", label: "Done", color: "bg-[linear-gradient(180deg,#f8fffb_0%,#edf8f1_100%)]" },
];

const COLUMN_STYLES: Record<Status, { border: string; badge: string; text: string }> = {
  TODO: {
    border: "border-[#cfe0f3]",
    badge: "bg-[#e6effc] text-[#003580]",
    text: "text-[#003580]",
  },
  IN_PROGRESS: {
    border: "border-[#f0dfaa]",
    badge: "bg-[#fff0bf] text-[#946200]",
    text: "text-[#946200]",
  },
  DONE: {
    border: "border-[#c7e2d0]",
    badge: "bg-[#e0f2e7] text-[#007236]",
    text: "text-[#007236]",
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
      <div className="flex gap-5 overflow-x-auto pb-4">
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

function Column({
  id, label, color, count, children,
}: {
  id: Status; label: string; color: string; count: number; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const styles = COLUMN_STYLES[id];

  return (
    <div
      ref={setNodeRef}
      className={`flex w-80 flex-shrink-0 flex-col rounded-[1.75rem] border bg-card shadow-[0_18px_45px_rgba(15,35,63,0.08)] transition-colors ${
        isOver ? `${styles.border} ring-2 ring-primary/10` : styles.border
      }`}
    >
      <div className={`rounded-t-[1.75rem] px-4 py-4 ${color}`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${styles.text}`}>{label}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badge}`}>
            {count}
          </span>
        </div>
      </div>
      <div className="flex min-h-[220px] flex-1 flex-col gap-3 p-4">
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
      className={`rounded-[1.4rem] border border-border bg-card p-4 shadow-[0_12px_28px_rgba(15,35,63,0.08)] transition-shadow ${
        isDragging ? "rotate-1 shadow-[0_18px_42px_rgba(15,35,63,0.16)]" : draggable ? "cursor-grab hover:shadow-[0_16px_36px_rgba(15,35,63,0.12)]" : "cursor-default"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-snug text-foreground">{item.title}</p>
        {item.dueDate && (
          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${isOverdue ? "bg-red-50 text-red-700" : "bg-secondary/60 text-primary"}`}>
            {new Date(item.dueDate + "T00:00:00").toLocaleDateString("en-GB", {
              day: "numeric", month: "short",
            })}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs font-medium text-muted-foreground">{item.eventTitle}</p>
      <div className="mt-2 flex items-center justify-between">
        {item.ownerName && (
          <span className="text-xs text-muted-foreground">{item.ownerName}</span>
        )}
        {isOverdue && <span className="text-xs font-semibold text-red-600">Overdue</span>}
      </div>
    </div>
  );
}
