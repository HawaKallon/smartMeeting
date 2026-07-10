"use client";

import { useState } from "react";
import { Table2, LayoutGrid } from "lucide-react";
import { KanbanBoard } from "./KanbanBoard";
import { ActionItemsTable } from "./ActionItemsTable";
import { ActionItemModal } from "./ActionItemModal";
import { OwnerFilter } from "./OwnerFilter";
import type { ActionItemListItem } from "./utils";

type User = { id: string; name: string | null; email: string };

interface Props {
  items: ActionItemListItem[];
  canMoveAny: boolean;
  currentUserId: string;
  ownerFilter: string;
  users: User[];
}

export function ActionItemsView({ items, canMoveAny, currentUserId, ownerFilter, users }: Props) {
  const [view, setView] = useState<"table" | "board">("board");
  const [selectedItem, setSelectedItem] = useState<ActionItemListItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const toggleButtonClass =
    "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5";
  const activeButtonClass = `${toggleButtonClass} bg-secondary text-foreground`;
  const inactiveButtonClass = `${toggleButtonClass} text-muted-foreground hover:bg-secondary/50`;

  return (
    <div className="space-y-4">
      {/* Toolbar: View toggle + Owner filter */}
      <div className="flex items-center justify-between">
        <div className="rounded-lg border border-border bg-card p-0.5 flex gap-0">
          <button
            onClick={() => setView("table")}
            className={view === "table" ? activeButtonClass : inactiveButtonClass}
            title="Table view"
          >
            <Table2 size={16} />
            Table
          </button>
          <button
            onClick={() => setView("board")}
            className={view === "board" ? activeButtonClass : inactiveButtonClass}
            title="Board view"
          >
            <LayoutGrid size={16} />
            Board
          </button>
        </div>

        {users.length > 0 && (
          <OwnerFilter users={users} currentFilter={ownerFilter} />
        )}
      </div>

      {/* Content: Table or Board */}
      {view === "table" ? (
        <ActionItemsTable
          items={items}
          canMoveAny={canMoveAny}
          currentUserId={currentUserId}
          ownerFilter={ownerFilter}
          onItemClick={(item) => {
            setSelectedItem(item);
            setModalOpen(true);
          }}
        />
      ) : (
        <KanbanBoard
          items={items}
          canMoveAny={canMoveAny}
          currentUserId={currentUserId}
          ownerFilter={ownerFilter}
          onItemClick={(item) => {
            setSelectedItem(item);
            setModalOpen(true);
          }}
        />
      )}

      {/* Modal */}
      <ActionItemModal
        item={selectedItem}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedItem(null);
        }}
      />
    </div>
  );
}
