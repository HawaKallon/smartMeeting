import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import type { MinistryRole } from "../src/generated/prisma/enums";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const USERS: { email: string; name: string; role: MinistryRole }[] = [
  { email: "minister@ministry.gov", name: "Hon. Arthur Vance", role: "MINISTER" },
  { email: "ps@ministry.gov", name: "Permanent Secretary", role: "PERMANENT_SECRETARY" },
  { email: "deputy.minister@ministry.gov", name: "Deputy Minister", role: "DEPUTY_MINISTER" },
  { email: "ds@ministry.gov", name: "Deputy Secretary", role: "DEPUTY_SECRETARY" },
  { email: "admin@ministry.gov", name: "Clara Jenkins (Admin)", role: "ADMIN" },
];

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { email: u.email, name: u.name, role: u.role, passwordHash },
    });
    console.log(`✓ ${u.role.padEnd(20)} ${u.email}`);
  }

  console.log("\nAll users share password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
