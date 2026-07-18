"use client";

import { useCallback, useRef, useState } from "react";
import { X } from "lucide-react";

interface Ministry {
  id: string;
  name: string;
  code: string;
}

interface MinistryMultiSelectProps {
  ministries: Ministry[];
  selected: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  disabledMinistryId?: string | null;
  label?: string;
  helperText?: string;
}

export function MinistryMultiSelect({
  ministries,
  selected,
  onSelectionChange,
  disabledMinistryId,
  label = "Invite Ministries",
  helperText = "Search or select ministries to invite to this event.",
}: MinistryMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMinistries = ministries.filter((m) => selected.includes(m.id));
  const availableMinistries = ministries.filter(
    (m) => !selected.includes(m.id) && m.id !== disabledMinistryId,
  );

  const filteredMinistries = availableMinistries.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAddMinistry = useCallback(
    (ministryId: string) => {
      if (!selected.includes(ministryId)) {
        onSelectionChange([...selected, ministryId]);
      }
      setSearchTerm("");
      inputRef.current?.focus();
    },
    [selected, onSelectionChange],
  );

  const handleRemoveMinistry = useCallback(
    (ministryId: string) => {
      onSelectionChange(selected.filter((id) => id !== ministryId));
    },
    [selected, onSelectionChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredMinistries.length > 0) {
      e.preventDefault();
      handleAddMinistry(filteredMinistries[0].id);
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <div className="relative">
        <div className="w-full rounded-xl border border-border bg-background p-3 space-y-2 min-h-[2.75rem]">
          {/* Selected pills */}
          <div className="flex flex-wrap gap-2">
            {selectedMinistries.map((ministry) => (
              <div
                key={ministry.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#003580] text-white px-3 py-1.5 text-sm"
              >
                <span>{ministry.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveMinistry(ministry.id)}
                  className="hover:opacity-75 transition-opacity"
                  aria-label={`Remove ${ministry.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Search input */}
            <div className="flex-1 min-w-[200px]">
              <input
                ref={inputRef}
                type="text"
                placeholder={selectedMinistries.length === 0 ? "Search or select ministries..." : "Add more..."}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent outline-none text-foreground placeholder-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
            {filteredMinistries.length > 0 ? (
              <ul className="py-1">
                {filteredMinistries.map((ministry) => (
                  <li key={ministry.id}>
                    <button
                      type="button"
                      onClick={() => handleAddMinistry(ministry.id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#f0f5fc] transition-colors text-sm text-foreground flex items-center justify-between"
                    >
                      <span>
                        <div className="font-medium">{ministry.name}</div>
                        <div className="text-xs text-muted-foreground">{ministry.code}</div>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : searchTerm && availableMinistries.length > 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                No ministries match &quot;{searchTerm}&quot;
              </div>
            ) : availableMinistries.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                All ministries already selected
              </div>
            ) : null}
          </div>
        )}

        {/* Close dropdown when clicking outside */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}

      {/* Hidden inputs for form submission */}
      {selected.map((id) => (
        <input
          key={id}
          type="hidden"
          name="invitedMinistryIds"
          value={id}
        />
      ))}
    </div>
  );
}
