import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageEvents, isSuperAdmin } from "@/lib/roles";
import { getReportAnalytics } from "@/lib/analytics";
import { generateReportPdf } from "@/lib/generateReportPdf";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const user = session.user;
  if (!canManageEvents(user.systemRole) && !isSuperAdmin(user.systemRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const analytics = await getReportAnalytics(user);

  // Scope label: ministry name for ministry users, "All ministries" for super-admins.
  let scopeLabel = "All ministries";
  if (!analytics.superAdmin && user.ministryId) {
    const ministry = await prisma.ministry.findUnique({
      where: { id: user.ministryId },
      select: { name: true },
    });
    scopeLabel = ministry?.name ?? "Your ministry";
  }

  const buffer = await generateReportPdf({
    analytics,
    scopeLabel,
    generatedDate: new Date().toLocaleDateString("en-GB"),
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="smart-meeting-report.pdf"`,
    },
  });
}
