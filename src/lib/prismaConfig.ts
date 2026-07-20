/**
 * Prisma Configuration for Serverless Environments
 *
 * This file centralizes all Prisma client configuration with detailed
 * explanations of each setting and why it's critical for serverless
 * database connectivity.
 */

import { Prisma } from "@/generated/prisma/client";

/**
 * Determines if running in production environment.
 * Production = deployed to users (Vercel, AWS Lambda, etc.)
 * Development = local machine or staging
 */
const isProduction = process.env.NODE_ENV === "production";

/**
 * Determines if running in serverless environment.
 * Serverless = Lambda, Vercel Functions, Google Cloud Functions, etc.
 * These need different pooling strategies than traditional servers.
 */
function isServerlessEnvironment(): boolean {
  return (
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
    process.env.VERCEL !== undefined ||
    process.env.NETLIFY !== undefined ||
    process.env.RAILWAY_ENVIRONMENT_NAME !== undefined ||
    process.env.K_SERVICE !== undefined // Google Cloud Functions
  );
}

/**
 * Prisma client configuration for connection pooling.
 *
 * Key consideration: Serverless connections are ephemeral.
 * - Each function invocation is isolated
 * - Connections can't be reused across invocations
 * - Need to minimize connections per invocation
 */
export const getPrismaClientOptions = (): any => {
  const serverless = isServerlessEnvironment();

  return {
    // Logging strategy:
    // - emit: "event" allows us to capture query events programmatically
    // - Other options: stdout/stderr (noisy in production)
    // We only log slow queries (>500ms) to avoid noise
    log: [
      {
        emit: "event",
        level: "query",
      },
      {
        emit: "event",
        level: "warn",
      },
      {
        emit: "event",
        level: "error",
      },
    ],

    // Error format: skip in production since we're using event listeners
    // Development: use pretty for console readability

    // RejectOnNotFound is deprecated in Prisma v4+
    // Use try/catch or explicit null checks instead
  };
};

/**
 * PgBouncer (Neon's connection pooler) configuration.
 *
 * Why PgBouncer?
 * - Multiplexes many client connections onto fewer database connections
 * - Reduces connection overhead by ~95%
 * - Essential for serverless environments
 *
 * Why transaction mode?
 * - Connection is returned to pool after each transaction
 * - vs Session mode: holds connection for entire session (wasteful)
 * - Perfect for serverless where each function is a short request
 */
export interface PgBouncerConfig {
  // Application name for connection labeling (helps with monitoring)
  application_name: string;

  // Connection pooling mode
  // "transaction" = return connection after transaction (recommended for serverless)
  // "session" = hold connection for entire session (wastes resources)
  mode: "transaction" | "session";

  // Pool size configuration (per-user, per-database)
  pool: {
    // Maximum number of connections to database
    // Serverless: 3 (keep small to avoid exhaustion)
    // Local: 10 (larger pool during development is fine)
    max_size: number;

    // Minimum connections to keep alive
    // Serverless: 1 (only necessary idle connection)
    // Local: 2 (avoid cold start during testing)
    min_size: number;

    // Wait timeout for acquiring a connection
    // If pool is exhausted, wait this long before returning error
    // Serverless: 3000ms is enough (connections should be fast)
    reserve_pool_timeout_ms: number;

    // Time connection can be idle before being closed
    // Serverless: 300000ms (5 min) - reclaim unused connections
    // Local: 3600000ms (1 hour) - keep connections during dev
    idle_in_transaction_session_timeout_ms: number;
  };

  // Query timeout to prevent runaway queries
  // Serverless: 30000ms (30s) - serverless should be fast
  // Local: 60000ms (60s) - allow time for debugging
  statement_timeout_ms: number;

  // Statement cache size (prepared statement cache)
  // Caches compiled queries to avoid re-parsing
  // Serverless: 20 (smaller since connections are short-lived)
  // Local: 50 (larger since connections persist)
  // Higher values = more memory but less parsing overhead
  statement_cache_size: number;
}

/**
 * Get PgBouncer configuration based on environment.
 * This is passed to @prisma/adapter-pg
 */
export function getPgBouncerConfig(): Record<string, any> {
  const serverless = isServerlessEnvironment();

  return {
    // Connection pooling mode - CRITICAL for serverless
    // Transaction mode: connection returned after each transaction
    // This is what allows one connection to serve many requests
    pgbouncer: true,

    // Pool configuration
    max_pool_size: serverless ? 3 : 10,
    min_pool_size: serverless ? 1 : 2,

    // Wait up to 3 seconds to acquire a connection from the pool
    // If pool is exhausted after 3s, return "too many connections" error
    reserve_pool_timeout: 3000,

    // Kill idle transactions after this timeout
    // Serverless: 5s - connections are short-lived, reclaim quickly
    // Local: 30s - allow time during interactive development
    idle_in_transaction_session_timeout: serverless ? 5000 : 30000,

    // Statement cache - prepared statements stay in memory
    // Reduces parse time on repeated queries
    // Serverless: 20 (smaller, connections are ephemeral)
    // Local: 50 (larger, connections are persistent)
    statement_cache_size: serverless ? 20 : 50,

    // Query timeout - prevent infinite loops
    // Serverless: 30s (functions should return quickly)
    // Local: 60s (debugging may take time)
    statement_timeout: serverless ? 30000 : 60000,
  };
}

/**
 * Connection reuse strategy documentation.
 *
 * CRITICAL: How PrismaClient singleton improves performance
 *
 * Problem (without singleton):
 * - Every route/function creates new PrismaClient
 * - Each client = new connection pool = 5-10 new connections
 * - 100 requests = 500-1000 connections ❌
 * - Result: "too many connections" error
 *
 * Solution (with singleton):
 * - Global PrismaClient is reused across all routes
 * - Single connection pool is shared
 * - 100 requests = 5-10 connections ✅
 * - Result: Efficient resource usage
 *
 * Implementation in prisma.ts:
 * - Check if globalThis.prisma exists (already created)
 * - If yes: return existing client
 * - If no: create new client and store in globalThis
 * - In production: keep client for function lifetime
 * - In development: reuse across hot reloads
 */

/**
 * Error handling strategy for connection failures.
 *
 * What can go wrong?
 * 1. Connection pool exhausted
 *    → too many connections
 *    → Solution: Reduce pool size or reduce concurrent requests
 *
 * 2. Connection timeout
 *    → connect ETIMEDOUT
 *    → Solution: Check network, increase timeout
 *
 * 3. Idle in transaction timeout
 *    → canceling statement due to user request
 *    → Solution: Complete transactions faster
 *
 * 4. Connection refused
 *    → ECONNREFUSED
 *    → Solution: Database is down, check Neon status
 *
 * 5. SSL/TLS errors
 *    → certificate verify failed
 *    → Solution: Ensure sslmode is correct, check certificates
 *
 * Recommended error handling:
 * - Log full error with context
 * - Return user-friendly error message
 * - Trigger alerting for database connection failures
 */

/**
 * Performance monitoring points.
 *
 * Metrics to track:
 * 1. Active connections
 *    SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
 *
 * 2. Idle connections
 *    SELECT count(*) FROM pg_stat_activity WHERE state = 'idle';
 *
 * 3. Query latency (from Prisma logs)
 *    Track queries > 500ms (logged in prisma.ts)
 *
 * 4. Connection acquisition time
 *    How long to get a connection from pool?
 *
 * 5. Connection reuse ratio
 *    How many requests per connection?
 *
 * Healthy serverless app:
 * - Total connections: 3-10 (even under load)
 * - P95 latency: <500ms
 * - Slow queries: <1% of total
 * - Connection reuse: >10 requests per connection
 */

/**
 * Environment-specific settings summary.
 */
export const environmentConfig = {
  // Development (local machine)
  development: {
    poolSize: { min: 2, max: 10 },
    cacheSize: 50,
    idleTimeout: 30000,
    statementTimeout: 60000,
    logging: true,
    rationale: "Local development doesn't have concurrency limits",
  },

  // Staging (Vercel preview deployment)
  staging: {
    poolSize: { min: 1, max: 5 },
    cacheSize: 30,
    idleTimeout: 10000,
    statementTimeout: 45000,
    logging: true,
    rationale: "Staging has some concurrency but not production scale",
  },

  // Production (Vercel/Lambda deployment)
  production: {
    poolSize: { min: 1, max: 3 },
    cacheSize: 20,
    idleTimeout: 5000,
    statementTimeout: 30000,
    logging: false,
    rationale: "Serverless has high concurrency, need minimal pool size",
  },
};

/**
 * Troubleshooting guide embedded in config.
 *
 * Symptom 1: "too many connections"
 * - Cause: Pool exhausted by concurrent requests
 * - Fix: Reduce max_pool_size from 3 to 2
 * - Or: Reduce statement_timeout to kill slow queries faster
 *
 * Symptom 2: Connection timeout
 * - Cause: Reserve pool timeout (3s) exceeded
 * - Fix: Check database performance, increase timeout to 5s temporarily
 *
 * Symptom 3: High P95 latency on first request
 * - Cause: Cold start + connection establishment
 * - Fix: Ensure min_pool_size > 0 to keep warm connections
 *
 * Symptom 4: "canceling statement due to user request"
 * - Cause: Idle in transaction timeout (5s) exceeded
 * - Fix: Reduce transaction duration or increase timeout to 10s
 *
 * Symptom 5: Memory usage increasing over time
 * - Cause: Connection leak (not returning connections to pool)
 * - Fix: Ensure all prisma operations complete properly
 * - Check: No missing await statements
 */
