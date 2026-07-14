import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { normalizedDatabaseUrl } from "@/lib/databaseUrl";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const adapter = new PrismaPg({ connectionString: normalizedDatabaseUrl() });
  const client = new PrismaClient({
    adapter,
    log: [{ emit: "event", level: "query" }],
  });

  client.$on("query", (e) => {
    if (e.duration > 500) {
      console.log(`[SLOW QUERY] ${e.duration}ms: ${e.query}`);
    }
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
