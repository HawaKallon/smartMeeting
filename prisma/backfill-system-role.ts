import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import type { MinistryRole, SystemRole } from "../src/generated/prisma/enums";

const ROLE_MAPPING: Record<MinistryRole, { systemRole: SystemRole; jobTitle: string | null }> = {
  SUPER_ADMIN: { systemRole: "SUPER_ADMIN", jobTitle: null },
  ADMIN: { systemRole: "MINISTRY_ADMIN", jobTitle: null },
  ADMIN_STAFF: { systemRole: "EVENT_MANAGER", jobTitle: null },
  PERMANENT_SECRETARY: { systemRole: "APPROVER", jobTitle: "Permanent Secretary" },
  DEPUTY_SECRETARY: { systemRole: "APPROVER", jobTitle: "Deputy Secretary" },
  MINISTER: { systemRole: "MINISTRY_ADMIN", jobTitle: "Minister" },
  DEPUTY_MINISTER: { systemRole: "EXECUTIVE_VIEWER", jobTitle: "Deputy Minister" },
  STAFF_MEMBER: { systemRole: "STAFF", jobTitle: null },
};

async function main() {
  console.log("Starting systemRole/jobTitle backfill...");

  const users = await prisma.user.findMany({ select: { id: true, role: true } });
  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    const mapping = ROLE_MAPPING[user.role];
    if (!mapping) {
      console.warn(`Unknown role "${user.role}" for user ${user.id}, skipping`);
      skipped++;
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        systemRole: mapping.systemRole,
        jobTitle: mapping.jobTitle,
      },
    });
    updated++;
  }

  console.log(`Backfill complete: ${updated} users updated, ${skipped} skipped`);

  // Verify
  const withoutSystemRole = await prisma.user.findMany({
    where: { systemRole: null },
    select: { id: true, email: true },
  });

  if (withoutSystemRole.length > 0) {
    console.error(
      `ERROR: ${withoutSystemRole.length} users still have null systemRole:`,
      withoutSystemRole,
    );
    process.exit(1);
  }

  console.log("✓ Verification passed: all users have a systemRole");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
