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
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground w-64">
        <SearchIcon className="h-3.5 w-3.5 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground"
        />
      </div>
    </form>
  );
}
