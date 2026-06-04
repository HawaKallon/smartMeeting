import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffRole } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { COLOR_META } from "@/lib/colors";
import { deleteLetter } from "./actions";
import { LetterComposer } from "./LetterComposer";
import { LetterPanel } from "./LetterPanel";

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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <BackButton href={`/events/${id}`} label={event.title} />
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Letters</h1>
          {event.colorCategory && (
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${COLOR_META[event.colorCategory].badge}`}>
              {COLOR_META[event.colorCategory].label}
            </span>
          )}
        </div>
      </div>

      {/* Existing letters */}
      {event.letters.length > 0 && (
        <div className="space-y-4">
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
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-gray-700">
          {event.letters.length === 0 ? "Compose first letter" : "Add another letter"}
        </h2>
        <LetterComposer eventId={id} />
      </div>
    </div>
  );
}
