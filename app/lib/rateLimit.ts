import 'server-only';
import { headers } from 'next/headers';

// In-memory IP tracking cache (sliding window)
const ipCache = new Map<string, number[]>();

// Simple IP-based rate limiting helper for Server Actions
export async function rateLimit(limit = 10, windowMs = 60 * 1000): Promise<{ success: boolean; error?: string }> {
  try {
    const headerList = await headers();
    
    // Attempt standard Next.js client IP extraction
    const ip = headerList.get('x-forwarded-for')?.split(',')[0].trim() || 
               headerList.get('x-real-ip') || 
               '127.0.0.1';
               
    const now = Date.now();
    
    if (!ipCache.has(ip)) {
      ipCache.set(ip, [now]);
      return { success: true };
    }
    
    const timestamps = ipCache.get(ip)!;
    const activeTimestamps = timestamps.filter(t => now - t < windowMs);
    
    if (activeTimestamps.length >= limit) {
      console.warn(`[Rate Limit Exceeded] IP: ${ip}, hits: ${activeTimestamps.length}`);
      return { success: false, error: 'Too many requests. Please slow down and try again.' };
    }
    
    activeTimestamps.push(now);
    ipCache.set(ip, activeTimestamps);
    return { success: true };
  } catch (err: any) {
    console.error('Rate Limiter Error:', err);
    return { success: true }; // Soft fail in case headers check fails
  }
}
