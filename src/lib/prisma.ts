import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { normalizedDatabaseUrl } from "@/lib/databaseUrl";
import { getPrismaClientOptions, getPgBouncerConfig } from "@/lib/prismaConfig";

/**
 * Global PrismaClient singleton pattern for serverless.
 *
 * Why a singleton?
 * - Each PrismaClient creates a new connection pool
 * - Without singleton: every route creates new pool = connection explosion
 * - With singleton: one global pool = efficient connection reuse
 *
 * How it works:
 * 1. Check if globalThis.prisma already exists
 * 2. If yes: return existing (reuse across requests)
 * 3. If no: create new and store in globalThis
 *
 * For serverless (Vercel, Lambda):
 * - Singleton persists for function lifetime
 * - Multiple invocations = separate instances (that's fine)
 * - Total connections across all invocations: 3-10
 *
 * For traditional server:
 * - Singleton persists for entire server lifetime
 * - Connection pooling spans all requests
 * - Much more efficient than serverless
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create a new PrismaClient with serverless-optimized configuration.
 *
 * This function encapsulates all the connection pooling logic.
 * See prismaConfig.ts for detailed explanation of each setting.
 */
function createClient(): PrismaClient {
  // Get the normalized database URL with pooling parameters
  // This includes:
  // - SSL mode normalization (security)
  // - PgBouncer configuration (connection pooling)
  // - Pool size based on environment (serverless vs local)
  // - Statement cache configuration (query optimization)
  // - Timeout settings (safety and resource cleanup)
  const connectionString = normalizedDatabaseUrl();

  // Create the PgBouncer adapter with pooling configuration
  // @prisma/adapter-pg handles the actual connection management
  // All pooling is transparent to the application code
  const adapter = new PrismaPg({
    connectionString,
    // The schema parameter tells Prisma which schema to use
    // Usually "public" for standard PostgreSQL setups
    schema: "public",
  });

  // Create the PrismaClient with optimized settings
  const client = new PrismaClient({
    adapter,
    ...getPrismaClientOptions(),
  });

  // Query event listener for monitoring and debugging
  // This logs slow queries which indicates performance issues or N+1 queries
  client.$on("query", (e) => {
    // Only log queries exceeding 500ms
    // This threshold balances visibility with noise
    // Adjust based on your application's performance SLA
    if (e.duration > 500) {
      console.log(
        `[SLOW QUERY] ${e.duration}ms: ${e.query.substring(0, 100)}...`
      );
    }
  });

  // Warn listener for debugging connection issues
  client.$on("warn", (e) => {
    console.warn(`[PRISMA WARN] ${e.message}`);
  });

  // Error listener for debugging critical issues
  client.$on("error", (e) => {
    console.error(`[PRISMA ERROR] ${e.message}`);
  });

  return client;
}

/**
 * Global Prisma client instance.
 *
 * How singleton pattern works:
 * - Execution 1: globalForPrisma.prisma is undefined
 *   → createClient() called
 *   → new PrismaClient created
 *   → stored in globalForPrisma.prisma
 *
 * - Execution 2: globalForPrisma.prisma exists
 *   → skip createClient()
 *   → reuse existing client
 *   → same connection pool
 *
 * In development:
 * - globalForPrisma.prisma = prisma (see below)
 * - Hot reload creates new module instance
 * - But Node's require cache keeps old globalThis
 * - So connections might persist (that's okay, actually good)
 *
 * In production:
 * - globalForPrisma.prisma NOT reassigned
 * - Ensures one client per function invocation
 * - Connections cleaned up when function ends
 */
export const prisma = globalForPrisma.prisma ?? createClient();

/**
 * In development: Store singleton in globalThis for hot reload reuse.
 *
 * Why?
 * - Hot module reloading creates new module instances
 * - Without this line: new PrismaClient created on every reload
 * - With this line: reuse existing client, avoid connection spam
 * - Improves DX by reducing "too many connections" errors during dev
 *
 * Why not in production?
 * - Production doesn't hot reload
 * - Unnecessary assignment
 * - One assignment per deploy is fine
 */
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Cleanup on application shutdown (if needed).
 *
 * In serverless environments, the function handles cleanup.
 * In traditional servers, this ensures graceful shutdown.
 *
 * Usage:
 * process.on('SIGTERM', async () => {
 *   await prisma.$disconnect();
 * });
 *
 * Note: We don't call this automatically because:
 * - Serverless runtime will terminate process
 * - Early disconnect causes "Client is closed" errors on subsequent queries
 * - Better to let runtime handle cleanup
 */
