const LEGACY_STRICT_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

/**
 * Determines if we're in a serverless environment.
 * Serverless functions need different pooling strategies than traditional servers.
 * Checks for common serverless runtime indicators.
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
 * Normalize database URL and add connection pooling parameters.
 *
 * What this does:
 * 1. Converts legacy SSL modes to verify-full (stricter, more secure)
 * 2. Adds Neon PgBouncer parameters for connection pooling
 * 3. Configures pool size based on environment (serverless vs traditional)
 * 4. Sets statement cache size for query optimization
 * 5. Configures idle timeouts to prevent connection leaks
 *
 * Connection pooling is critical for serverless because:
 * - Each function invocation creates a new PrismaClient
 * - Without pooling, 100 concurrent invocations = 100+ connections
 * - Neon's free tier only allows ~100 total connections
 * - This causes "too many connections" errors
 *
 * Solution: Neon's PgBouncer in transaction mode multiplexes connections.
 */
export function normalizedDatabaseUrl(value = process.env.DATABASE_URL): string {
  if (!value) throw new Error("DATABASE_URL is not configured");

  const url = new URL(value);

  // Step 1: Normalize SSL mode for stricter verification
  const sslMode = url.searchParams.get("sslmode");
  if (sslMode && LEGACY_STRICT_SSL_MODES.has(sslMode)) {
    url.searchParams.set("sslmode", "verify-full");
  }

  // Step 2: Add PgBouncer configuration for connection pooling
  // PgBouncer is Neon's connection pooler that multiplexes connections.
  // This prevents connection pool exhaustion in high-concurrency scenarios.
  if (!url.searchParams.has("pgbouncer")) {
    url.searchParams.set("pgbouncer", "true");
  }

  // Step 3: Configure pool size based on environment
  // Serverless environments need much tighter pooling than traditional servers
  const isServerless = isServerlessEnvironment();

  if (!url.searchParams.has("max_pool_size")) {
    // Production serverless: Keep pool small (1-3 connections)
    // Local development: Larger pool (5-10 connections) is fine
    const maxPoolSize = isServerless ? "3" : "10";
    url.searchParams.set("max_pool_size", maxPoolSize);
  }

  if (!url.searchParams.has("min_pool_size")) {
    // Minimum connections to keep alive
    // Serverless: Keep minimal (1) to save resources
    // Local: Keep a few (2) to avoid cold starts during testing
    const minPoolSize = isServerless ? "1" : "2";
    url.searchParams.set("min_pool_size", minPoolSize);
  }

  // Step 4: Statement cache size
  // Caches prepared statements to avoid re-parsing queries
  // Serverless: Smaller cache (20) since connections are short-lived
  // Local: Larger cache (50) since connections persist
  if (!url.searchParams.has("statement_cache_size")) {
    const cacheSize = isServerless ? "20" : "50";
    url.searchParams.set("statement_cache_size", cacheSize);
  }

  // Step 5: Idle in transaction timeout
  // Kills connections that are idle inside transactions
  // Prevents connections from being held unnecessarily
  // Serverless: Aggressive timeout (5s) to free connections quickly
  // Local: Longer timeout (30s) for interactive development
  if (!url.searchParams.has("idle_in_transaction_session_timeout")) {
    const timeoutMs = isServerless ? "5000" : "30000";
    url.searchParams.set("idle_in_transaction_session_timeout", timeoutMs);
  }

  // Step 6: Query timeout for safety
  // Prevents runaway queries from consuming resources
  // Serverless: Shorter timeout (30s) since functions shouldn't be long-running
  // Local: Longer timeout (60s) for development and debugging
  if (!url.searchParams.has("statement_timeout")) {
    const timeoutMs = isServerless ? "30000" : "60000";
    url.searchParams.set("statement_timeout", timeoutMs);
  }

  return url.toString();
}
