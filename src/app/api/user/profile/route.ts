
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { uid } = body;

        if (!uid) {
            return NextResponse.json(
                { error: 'Missing UID' },
                { status: 400 }
            );
        }

        const cacheKey = `user:profile:${uid}`;

        // 1. Try fetching from Redis Cache first
        // TEMPORARY: Disable cache to force fresh fetch for role updates
        /* 
        try {
            const cachedProfile = await redis.get(cacheKey);
            if (cachedProfile) {
                return NextResponse.json({ user: JSON.parse(cachedProfile) });
            }
        } catch (cacheErr) {
            console.warn('Redis Cache Read Error:', cacheErr);
            // Continue to DB if cache fails
        }
        */

        // 2. Fetch user profile using Admin Client (Bypasses RLS)
        const { data, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("id", uid)
            .single();

        if (error) {
            // If user not found, return null data, don't error 500
            if (error.code === 'PGRST116') {
                return NextResponse.json({ user: null });
            }
            console.error('Supabase Fetch Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 3. Store result in Redis Cache (TTL: 1 hour)
        if (data) {
            try {
                await redis.set(cacheKey, JSON.stringify(data), { EX: 3600 });
            } catch (cacheWriteErr) {
                console.warn('Redis Cache Write Error:', cacheWriteErr);
            }
        }

        return NextResponse.json({ user: data });

    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
