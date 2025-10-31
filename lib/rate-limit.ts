// Simple in-memory rate limiting (use Redis in production)
interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

class RateLimit {
  private entries = new Map<string, RateLimitEntry>();
  private configs = {
    ai_chat: { limit: 20, window: 60 * 1000 }, // 20 requests per minute
    booking: { limit: 10, window: 60 * 1000 }, // 10 requests per minute
    general: { limit: 100, window: 60 * 1000 }, // 100 requests per minute
    sensitive: { limit: 5, window: 60 * 1000 } // 5 requests per minute
  };

  async check(identifier: string, type: keyof typeof this.configs = 'general'): Promise<RateLimitResult> {
    const config = this.configs[type];
    const now = Date.now();
    const key = `${identifier}:${type}`;
    
    let entry = this.entries.get(key);
    
    // Clean expired entries
    if (entry && now > entry.resetTime) {
      entry = undefined;
      this.entries.delete(key);
    }
    
    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + config.window,
        blocked: false
      };
      this.entries.set(key, entry);
    }
    
    entry.count++;
    
    const allowed = entry.count <= config.limit;
    const remaining = Math.max(0, config.limit - entry.count);
    const resetTime = new Date(entry.resetTime);
    
    if (!allowed) {
      entry.blocked = true;
    }
    
    return {
      allowed,
      limit: config.limit,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000)
    };
  }
  
  getStats() {
    return {
      totalEntries: this.entries.size,
      blockedEntries: Array.from(this.entries.values()).filter(e => e.blocked).length
    };
  }
  
  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.entries.entries()) {
      if (now > entry.resetTime) {
        this.entries.delete(key);
      }
    }
  }
}

export const rateLimit = new RateLimit();

// Cleanup every 5 minutes
setInterval(() => {
  rateLimit.cleanup();
}, 5 * 60 * 1000);