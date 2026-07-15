import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import type { SystemRole } from "../src/generated/prisma/enums";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Each ministry owns a distinct gov.sl subdomain; logins are routed to the
// ministry whose emailDomain matches the user's email (see src/auth.ts).
const MINISTRIES: { code: string; name: string; emailDomain: string }[] = [
  { code: "MOH", name: "Ministry of Health", emailDomain: "moh.gov.sl" },
  { code: "MOE", name: "Ministry of Education", emailDomain: "moe.gov.sl" },
];

const MINISTRY_USERS: {
  email: string;
  name: string;
  systemRole: SystemRole;
  jobTitle: string | null;
  ministryCode: string;
}[] = [
  // MOH (@moh.gov.sl)
  {
    email: "admin@moh.gov.sl",
    name: "MOH Admin",
    systemRole: "MINISTRY_ADMIN",
    jobTitle: null,
    ministryCode: "MOH",
  },
  {
    email: "minister@moh.gov.sl",
    name: "Hon. Arthur Vance",
    systemRole: "MINISTER",
    jobTitle: "Minister",
    ministryCode: "MOH",
  },
  {
    email: "ps@moh.gov.sl",
    name: "Permanent Secretary",
    systemRole: "STAFF",
    jobTitle: "Permanent Secretary",
    ministryCode: "MOH",
  },
  {
    email: "deputy.minister@moh.gov.sl",
    name: "Deputy Minister",
    systemRole: "STAFF",
    jobTitle: "Deputy Minister",
    ministryCode: "MOH",
  },
  {
    email: "ds@moh.gov.sl",
    name: "Deputy Secretary",
    systemRole: "STAFF",
    jobTitle: "Deputy Secretary",
    ministryCode: "MOH",
  },
  {
    email: "admin.staff@moh.gov.sl",
    name: "John Smith (Admin Staff)",
    systemRole: "STAFF",
    jobTitle: null,
    ministryCode: "MOH",
  },
  {
    email: "pa@moh.gov.sl",
    name: "Minister's PA",
    systemRole: "STAFF",
    jobTitle: "Minister's PA",
    ministryCode: "MOH",
  },

  // MOE (@moe.gov.sl)
  {
    email: "admin@moe.gov.sl",
    name: "MOE Admin",
    systemRole: "MINISTRY_ADMIN",
    jobTitle: null,
    ministryCode: "MOE",
  },
  {
    email: "minister@moe.gov.sl",
    name: "Dr. Sarah Johnson",
    systemRole: "MINISTRY_ADMIN",
    jobTitle: "Minister",
    ministryCode: "MOE",
  },
  {
    email: "ps@moe.gov.sl",
    name: "PS Education",
    systemRole: "STAFF",
    jobTitle: "Permanent Secretary",
    ministryCode: "MOE",
  },
  {
    email: "ds@moe.gov.sl",
    name: "DS Education",
    systemRole: "STAFF",
    jobTitle: "Deputy Secretary",
    ministryCode: "MOE",
  },
];

const SUPER_ADMIN_USERS: {
  email: string;
  name: string;
  systemRole: "SUPER_ADMIN";
  jobTitle: null;
}[] = [
  {
    email: "hawa.kallon@mocti.gov.sl",
    name: "Hawa Kallon",
    systemRole: "SUPER_ADMIN",
    jobTitle: null,
  },
];

const ROOMS: {
  name: string;
  location: string;
  capacity: number;
  ministryCode: string;
}[] = [
  // MOH Rooms
  {
    name: "Board Room",
    location: "Floor 3",
    capacity: 20,
    ministryCode: "MOH",
  },
  {
    name: "Meeting Room A",
    location: "Floor 2",
    capacity: 10,
    ministryCode: "MOH",
  },
  {
    name: "Conference Hall",
    location: "Ground Floor",
    capacity: 50,
    ministryCode: "MOH",
  },

  // MOE Rooms
  {
    name: "Board Room",
    location: "Building A",
    capacity: 20,
    ministryCode: "MOE",
  },
  {
    name: "Training Room",
    location: "Building B",
    capacity: 30,
    ministryCode: "MOE",
  },
];

async function main() {
  console.log("🌱 Seeding database...\n");

  // Create ministries
  console.log("📋 Creating ministries...");
  const ministryMap: Record<string, string> = {};
  for (const m of MINISTRIES) {
    const ministry = await prisma.ministry.upsert({
      where: { code: m.code },
      update: { emailDomain: m.emailDomain },
      create: { code: m.code, name: m.name, emailDomain: m.emailDomain },
    });
    ministryMap[m.code] = ministry.id;
    console.log(`  ✓ ${m.name} (${m.code})`);
  }

  // Create ministry users
  console.log("\n👥 Creating ministry users...");
  const defaultPasswordHash = await bcrypt.hash("password123", 10);
  for (const u of MINISTRY_USERS) {
    const ministryId = ministryMap[u.ministryCode];
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, systemRole: u.systemRole, jobTitle: u.jobTitle, ministryId, passwordHash: defaultPasswordHash },
      create: {
        email: u.email,
        name: u.name,
        systemRole: u.systemRole,
        jobTitle: u.jobTitle,
        ministryId,
        passwordHash: defaultPasswordHash,
      },
    });
    const displayLabel = u.jobTitle ? `${u.systemRole} (${u.jobTitle})` : u.systemRole;
    console.log(`  ✓ ${displayLabel.padEnd(35)} ${u.email} (${u.ministryCode})`);
  }

  // Create super-admin users
  console.log("\n👑 Creating super-admin users...");
  const superAdminPasswordHash = await bcrypt.hash("platform88pass", 10);
  const keepEmails = SUPER_ADMIN_USERS.map((u) => u.email);
  await prisma.user.deleteMany({
    where: { email: { notIn: keepEmails } },
  });
  for (const u of SUPER_ADMIN_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, systemRole: u.systemRole, jobTitle: u.jobTitle, ministryId: null, passwordHash: superAdminPasswordHash },
      create: {
        email: u.email,
        name: u.name,
        systemRole: u.systemRole,
        jobTitle: u.jobTitle,
        ministryId: null,
        passwordHash: superAdminPasswordHash,
      },
    });
    console.log(`  ✓ ${u.systemRole.padEnd(20)} ${u.email}`);
  }

  // Create rooms per ministry
  console.log("\n🏢 Creating rooms...");
  for (const r of ROOMS) {
    const ministryId = ministryMap[r.ministryCode];
    // First try to find existing room by ministry + name
    const existing = await prisma.room.findFirst({
      where: { ministryId, name: r.name },
    });
    if (!existing) {
      await prisma.room.create({
        data: {
          ministryId,
          name: r.name,
          location: r.location,
          capacity: r.capacity,
          amenities: [],
        },
      });
    }
    console.log(`  ✓ ${r.name} (${r.location}) - ${r.ministryCode}`);
  }

  console.log("\n✅ Seeding complete!");
  console.log("\n🔑 Login credentials:");
  console.log("  Ministry users: password123");
  console.log("  Super admin: platform88pass");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
