
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const client = createClient({
    url: redisUrl,
    socket: {
        connectTimeout: 1000, // Reduced timeout
        reconnectStrategy: (retries) => Math.min(retries * 50, 500) // Aggressive retry limit
    }
});

let isConnecting = false;

client.on('error', (err) => {
    // Only log errors in production to avoid cluttering dev logs
    if (process.env.NODE_ENV === 'production') {
        console.error('Redis Client Error', err.message);
    }
});

async function ensureConnected() {
    if (client.isOpen) return true;
    if (isConnecting) return false;

    isConnecting = true;
    try {
        await client.connect();
        return true;
    } catch (err) {
        // Fail silently
        return false;
    } finally {
        isConnecting = false;
    }
}

// Singleton for Next.js HMR
const globalForRedis = global as unknown as { redis: any };

// Safe Wrapper Proxy
const safeRedis = new Proxy(client, {
    get(target, prop: any) {
        // Intercept standard commands to check connection status first
        if (prop === 'get') {
            return async (key: string) => {
                const connected = await ensureConnected();
                if (!connected) return null;
                try { return await target.get(key); } catch (e) { return null; }
            };
        }
        if (prop === 'set') {
            return async (key: string, value: string, options?: any) => {
                const connected = await ensureConnected();
                if (!connected) return; 
                try { return await target.set(key, value, options); } catch (e) { }
            };
        }
        if (prop === 'del') {
            return async (key: string | string[]) => {
                const connected = await ensureConnected();
                if (!connected) return;
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
