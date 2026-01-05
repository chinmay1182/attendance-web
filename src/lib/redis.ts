
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const client = createClient({
    url: redisUrl
});
// Singleton pattern for Next.js (avoids multiple connections in dev)
const globalForRedis = global as unknown as { redis: ReturnType<typeof createClient> };

const redisClientOptions = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        connectTimeout: 2000, // Fail connection after 2 seconds
        // commandTimeout: 1000, // Optional: Fail individual commands after 1 second
    }
    // Note: node-redis commands auto-reconnect by default, 
    // but in a serverless/API context we rely on try/catch in routes to fallback quickly.
};

export const redis = globalForRedis.redis || createClient(redisClientOptions);

// Attach error handler to the exported redis client
redis.on('error', (err) => console.error('Redis Client Error', err));

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis;
}

// Ensure the client connects
if (!redis.isOpen) {
    redis.connect().catch((err) => {
        // Log but don't crash. App should function without Redis.
        console.warn('Redis Connection Failed:', err.message);
    });
}

