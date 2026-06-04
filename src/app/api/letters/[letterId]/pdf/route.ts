import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateLetterPdf } from "@/lib/generateLetterPdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ letterId: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { letterId } = await params;

  const letter = await prisma.letter.findUnique({
    where: { id: letterId },
    include: {
      event: { select: { title: true, startAt: true, organizer: { select: { name: true } } } },
    },
  });
  if (!letter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const eventDate = letter.event.startAt.toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const buffer = await generateLetterPdf({
    title: letter.title,
    body: letter.body,
    colorCategory: letter.colorCategory,
    eventTitle: letter.event.title,
    eventDate,
    organizerName: letter.event.organizer.name,
    generatedDate: new Date().toLocaleDateString("en-GB"),
  });

  const slug = letter.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
    },
  });
}
