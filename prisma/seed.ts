import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import type { MinistryRole } from "../src/generated/prisma/enums";

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
  role: MinistryRole;
  ministryCode: string;
}[] = [
  // MOH (@moh.gov.sl)
  { email: "admin@moh.gov.sl", name: "MOH Admin", role: "ADMIN", ministryCode: "MOH" },
  { email: "minister@moh.gov.sl", name: "Hon. Arthur Vance", role: "MINISTER", ministryCode: "MOH" },
  { email: "ps@moh.gov.sl", name: "Permanent Secretary", role: "PERMANENT_SECRETARY", ministryCode: "MOH" },
  { email: "deputy.minister@moh.gov.sl", name: "Deputy Minister", role: "DEPUTY_MINISTER", ministryCode: "MOH" },
  { email: "ds@moh.gov.sl", name: "Deputy Secretary", role: "DEPUTY_SECRETARY", ministryCode: "MOH" },
  { email: "admin.staff@moh.gov.sl", name: "John Smith (Admin Staff)", role: "ADMIN_STAFF", ministryCode: "MOH" },

  // MOE (@moe.gov.sl)
  { email: "admin@moe.gov.sl", name: "MOE Admin", role: "ADMIN", ministryCode: "MOE" },
  { email: "minister@moe.gov.sl", name: "Dr. Sarah Johnson", role: "MINISTER", ministryCode: "MOE" },
  { email: "ps@moe.gov.sl", name: "PS Education", role: "PERMANENT_SECRETARY", ministryCode: "MOE" },
  { email: "ds@moe.gov.sl", name: "DS Education", role: "DEPUTY_SECRETARY", ministryCode: "MOE" },
];

const SUPER_ADMIN_USERS: { email: string; name: string; role: "SUPER_ADMIN" }[] = [
  { email: "superadmin@gov.sl", name: "Super Admin", role: "SUPER_ADMIN" },
  { email: "platform.admin@gov.sl", name: "Platform Admin", role: "SUPER_ADMIN" },
];

const ROOMS: { name: string; location: string; capacity: number; ministryCode: string }[] = [
  // MOH Rooms
  { name: "Board Room", location: "Floor 3", capacity: 20, ministryCode: "MOH" },
  { name: "Meeting Room A", location: "Floor 2", capacity: 10, ministryCode: "MOH" },
  { name: "Conference Hall", location: "Ground Floor", capacity: 50, ministryCode: "MOH" },

  // MOE Rooms
  { name: "Board Room", location: "Building A", capacity: 20, ministryCode: "MOE" },
  { name: "Training Room", location: "Building B", capacity: 30, ministryCode: "MOE" },
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
      update: { name: u.name, role: u.role, ministryId },
      create: { email: u.email, name: u.name, role: u.role, ministryId, passwordHash: defaultPasswordHash },
    });
    console.log(`  ✓ ${u.role.padEnd(20)} ${u.email} (${u.ministryCode})`);
  }

  // Create super-admin users
  console.log("\n👑 Creating super-admin users...");
  const superAdminPasswordHash = await bcrypt.hash("admin123", 10);
  for (const u of SUPER_ADMIN_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, ministryId: null },
      create: { email: u.email, name: u.name, role: u.role, ministryId: null, passwordHash: superAdminPasswordHash },
    });
    console.log(`  ✓ ${u.role.padEnd(20)} ${u.email}`);
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
        data: { ministryId, name: r.name, location: r.location, capacity: r.capacity, amenities: [] },
      });
    }
    console.log(`  ✓ ${r.name} (${r.location}) - ${r.ministryCode}`);
  }

  console.log("\n✅ Seeding complete!");
  console.log("\n🔑 Login credentials:");
  console.log("  Ministry users: password123");
  console.log("  Super admin: admin123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
