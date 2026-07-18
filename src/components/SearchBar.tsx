"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/administrative/search?q=${encodeURIComponent(query)}`);
    }
  }

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="flex w-full items-center gap-2 rounded-2xl border border-border bg-[#eef4fd] px-4 py-3 text-sm text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        <SearchIcon className="h-4 w-4 flex-shrink-0 text-primary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search meetings, rooms, attendees..."
          className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground"
        />
      </div>
    </form>
  );
}
