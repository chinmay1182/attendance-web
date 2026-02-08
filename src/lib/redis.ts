
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const client = createClient({
    url: redisUrl,
    socket: {
        connectTimeout: 2000,
    }
});

client.on('error', (err) => {
    // Suppress logs to avoid noise if not running
    if (process.env.NODE_ENV === 'development') return;
    console.error('Redis Client Error', err);
});

// Attempt connection non-blocking
if (!client.isOpen) {
    client.connect().catch((err) => {
        console.warn('⚠️ Redis not available, using in-memory fallback or database directly.');
    });
}

// Singleton for Next.js HMR
const globalForRedis = global as unknown as { redis: any };

// Safe Wrapper
const safeRedis = new Proxy(client, {
    get(target, prop: any) {
        // Intercept standard commands to check connection status first
        if (prop === 'get') {
            return async (key: string) => {
                if (!target.isOpen) return null;
                try { return await target.get(key); } catch (e) { return null; }
            };
        }
        if (prop === 'set') {
            return async (key: string, value: string, options?: any) => {
                if (!target.isOpen) return; // Fail silently
                try { return await target.set(key, value, options); } catch (e) { }
            };
        }
        if (prop === 'del') {
            return async (key: string | string[]) => {
                if (!target.isOpen) return;
                try { return await target.del(key); } catch (e) { }
            };
        }

        // Pass specific properties through
        if (prop === 'isOpen') return target.isOpen;
        if (prop === 'on') return target.on.bind(target);
        if (prop === 'connect') return target.connect.bind(target);

        // Default fallback for other methods
        return Reflect.get(target, prop);
    }
});

// Use singleton in dev
if (process.env.NODE_ENV !== 'production') {
    if (!globalForRedis.redis) globalForRedis.redis = safeRedis;
}

export const redis = (globalForRedis.redis || safeRedis) as typeof client;

