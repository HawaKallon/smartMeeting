#!/usr/bin/env tsx

import { getRedis, isRedisConnected, closeRedis } from '../src/lib/redis';
import { cache } from '../src/lib/cache';

/**
 * Test Redis connection and cache functionality
 * Run: npx tsx scripts/test-redis.ts
 */

async function testRedis() {
  console.log('🧪 Testing Redis Cache Setup...\n');

  // Test 1: Connection
  console.log('1️⃣  Testing Redis connection...');
  const redis = getRedis();
  if (!redis) {
    console.error(
      '❌ Redis not configured. Set REDIS_URL in .env\n' +
      '   Example: REDIS_URL="redis://localhost:6379"'
    );
    return;
  }

  try {
    const ping = await redis.ping();
    console.log(`✅ Connected: ${ping}\n`);
  } catch (err) {
    console.error(`❌ Connection failed: ${err}\n`);
    return;
  }

  // Test 2: Set/Get
  console.log('2️⃣  Testing set/get...');
  try {
    const testKey = 'test:cache';
    const testValue = { message: 'Hello Redis!', timestamp: new Date().toISOString() };

    await cache.set(testKey, testValue, { ttl: 60 });
    const retrieved = await cache.get<typeof testValue>(testKey);

    if (retrieved) {
      console.log(`✅ Set/Get working: ${JSON.stringify(retrieved)}\n`);
    }
  } catch (err) {
    console.error(`❌ Set/Get failed: ${err}\n`);
  }

  // Test 3: getOrSet
  console.log('3️⃣  Testing getOrSet...');
  try {
    let callCount = 0;
    const computeExpensiveValue = async () => {
      callCount++;
      return { computed: true, callCount };
    };

    const key = 'test:getorset';
    const result1 = await cache.getOrSet(key, computeExpensiveValue, { ttl: 10 });
    const result2 = await cache.getOrSet(key, computeExpensiveValue, { ttl: 10 });

    if (result1.callCount === 1 && result2.callCount === 1) {
      console.log(`✅ getOrSet working (cached, not recomputed)\n`);
    } else {
      console.log(`❌ getOrSet not caching properly\n`);
    }
  } catch (err) {
    console.error(`❌ getOrSet failed: ${err}\n`);
  }

  // Test 4: Delete
  console.log('4️⃣  Testing delete...');
  try {
    const testKey = 'test:delete';
    await cache.set(testKey, { value: 1 });
    await cache.delete(testKey);
    const result = await cache.get(testKey);

    if (result === null) {
      console.log(`✅ Delete working\n`);
    }
  } catch (err) {
    console.error(`❌ Delete failed: ${err}\n`);
  }

  // Test 5: Info
  console.log('5️⃣  Redis Server Info...');
  try {
    const info = await redis.info('server');
    const lines = info.split('\r\n').slice(0, 5);
    console.log(`✅ ${lines.join('\n')}\n`);
  } catch (err) {
    console.error(`❌ Info failed: ${err}\n`);
  }

  // Test 6: Monitor (show live keys)
  console.log('6️⃣  Current cache keys:');
  try {
    const keys = await redis.keys('*');
    if (keys.length === 0) {
      console.log('   (empty)\n');
    } else {
      keys.slice(0, 10).forEach(key => console.log(`   - ${key}`));
      if (keys.length > 10) {
        console.log(`   ... and ${keys.length - 10} more\n`);
      }
    }
  } catch (err) {
    console.error(`❌ Keys failed: ${err}\n`);
  }

  // Summary
  console.log('✅ Redis cache is ready!');
  console.log('\nNext steps:');
  console.log('1. Replace database queries with cache helpers');
  console.log('2. Add invalidation after mutations');
  console.log('3. Monitor cache with: redis-cli');
  console.log('4. See REDIS_INTEGRATION_EXAMPLES.md for patterns');

  await closeRedis();
}

testRedis().catch(console.error);
