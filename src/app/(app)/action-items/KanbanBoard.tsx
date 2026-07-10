"use client";

import { useRef, useState, useTransition } from "react";
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
  type DragCancelEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { changeItemStatus } from "./actions";
import {
  POINT_COLORS,
  POINT_LABELS,
  STATUS_COLORS,
  STATUS_ICON_COMPONENTS,
  formatTimeline,
  getOwnerInitials,
  isActionItemOverdue,
  type ActionItemListItem,
  type Status,
} from "./utils";

interface Props {
  items: ActionItemListItem[];
  canMoveAny: boolean;
  currentUserId: string;
  ownerFilter: string;
  onItemClick: (item: ActionItemListItem) => void;
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

export function KanbanBoard({ items: initial, canMoveAny, currentUserId, ownerFilter, onItemClick }: Props) {
  const [items, setItems] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const suppressClickRef = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const visible = ownerFilter === "all"
    ? items
    : items.filter((i) => i.ownerName !== null);

  const activeItem = activeId ? items.find((i) => i.id === activeId) ?? null : null;

  function canDrag(item: ActionItemListItem) {
    return canMoveAny || item.ownerId === currentUserId;
  }

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
  }

  function suppressNextClick(itemId: string) {
    suppressClickRef.current = itemId;
    window.setTimeout(() => {
      if (suppressClickRef.current === itemId) suppressClickRef.current = null;
    }, 0);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    suppressNextClick(String(active.id));
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

  function onDragCancel({ active }: DragCancelEvent) {
    setActiveId(null);
    suppressNextClick(String(active.id));
  }

  function handleItemClick(item: ActionItemListItem) {
    if (suppressClickRef.current === item.id) return;
    onItemClick(item);
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colItems = visible.filter((i) => i.status === col.id);
          return (
            <Column key={col.id} id={col.id} label={col.label} count={colItems.length}>
              {colItems.map((item) => (
                <Card
                  key={item.id}
                  item={item}
                  draggable={canDrag(item)}
                  isActive={item.id === activeId}
                  onClick={() => handleItemClick(item)}
                />
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

function Card({
  item,
  draggable,
  isActive,
  onClick,
}: {
  item: ActionItemListItem;
  draggable: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
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
      <CardView item={item} draggable={draggable} onClick={onClick} />
    </div>
  );
}

function CardView({
  item, draggable = true, isDragging = false, onClick,
}: {
  item: ActionItemListItem; draggable?: boolean; isDragging?: boolean; onClick?: () => void;
}) {
  const isOverdue = isActionItemOverdue(item.dueDate, item.status);
  const colors = STATUS_COLORS[item.status];
  const StatusIcon = STATUS_ICON_COMPONENTS[item.status];

  return (
    <div
      onClick={onClick}
      className={`rounded-lg border border-l-4 bg-card p-3 transition-all ${colors.border} ${
        isDragging ? "rotate-1 shadow-md" : draggable ? "cursor-grab hover:shadow-sm" : "cursor-pointer hover:shadow-sm"
      }`}
    >
      {/* Top row: Icon + Title + Point Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 flex-1">
          <StatusIcon size={16} className={`mt-0.5 flex-shrink-0 ${colors.icon}`} />
          <p className="text-sm font-medium leading-snug text-foreground">{item.title}</p>
        </div>
        <span className={`inline-block rounded px-2 py-1 text-[10px] font-semibold flex-shrink-0 ${POINT_COLORS[item.point]}`}>
          {POINT_LABELS[item.point]}
        </span>
      </div>

      {/* Event title */}
      <p className="text-xs text-muted-foreground mb-2">{item.eventTitle}</p>

      {/* Due date */}
      {item.dueDate && (
        <div className="mb-2">
          <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${isOverdue ? "bg-red-100 text-red-700" : "bg-secondary text-muted-foreground"}`}>
            {formatTimeline(item.dueDate)}
          </span>
          {isOverdue && <span className="ml-1.5 text-[10px] font-semibold text-red-600">Overdue</span>}
        </div>
      )}

      {/* Owner avatar + name */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary flex-shrink-0">
          {getOwnerInitials(item.ownerName)}
        </div>
        {item.ownerName && (
          <span className="text-xs text-muted-foreground truncate">{item.ownerName}</span>
        )}
      </div>
    </div>
  );
}
