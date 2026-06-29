import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffRole } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { COLOR_META } from "@/lib/colors";
import { deleteLetter } from "./actions";
import { LetterComposer } from "./LetterComposer";
import { LetterPanel } from "./LetterPanel";
import { Plus } from "lucide-react";

export default async function LettersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireStaffRole();

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      colorCategory: true,
      letters: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!event) notFound();

  return (
    <div className="space-y-6">
      <div>
        <BackButton href={`/administrative/events/${id}`} label={event.title} />
        <div className="mt-4 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Letters</h1>
          {event.colorCategory && (
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${COLOR_META[event.colorCategory].badge}`}>
              {COLOR_META[event.colorCategory].label}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Create and manage event correspondence</p>
      </div>

      {/* Existing letters */}
      {event.letters.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Published Letters ({event.letters.length})</h2>
          {event.letters.map((letter) => (
            <LetterPanel
              key={letter.id}
              letter={{
                id: letter.id,
                title: letter.title,
                body: letter.body,
                colorCategory: letter.colorCategory as "RED" | "AMBER" | "GREEN",
                createdAt: letter.createdAt.toLocaleDateString("en-GB"),
              }}
              eventId={id}
              deleteAction={deleteLetter}
            />
          ))}
        </div>
      )}

      {/* Compose new letter */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          {event.letters.length === 0 ? "Compose First Letter" : "Add Another Letter"}
        </h2>
        <LetterComposer eventId={id} />
      </div>
    </div>
  );
}
