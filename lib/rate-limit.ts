"use server";

// Configuration du rate limiting
export interface RateLimitConfig {
  windowMs: number; // Fenêtre de temps en millisecondes
  maxRequests: number; // Nombre maximum de requêtes
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (identifier: string) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // En secondes
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  windowStart: number;
}

// Configurations prédéfinies pour différents endpoints
const RATE_LIMIT_CONFIGS = {
  // API IA - plus restrictif
  ai_chat: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20 // 20 messages par minute
  },
  
  // API de réservation - modéré
  booking: {
    windowMs: 60 * 1000, // 1 minute  
    maxRequests: 10 // 10 réservations par minute
  },
  
  // Général - plus permissif
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100 // 100 requêtes par minute
  },
  
  // Strict pour les actions sensibles
  sensitive: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5 // 5 actions par minute
  },
  
  // DDoS protection - très restrictif
  ddos_protection: {
    windowMs: 1000, // 1 seconde
    maxRequests: 10 // 10 requêtes par seconde maximum
  }
};

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private suspiciousIPs = new Set<string>();
  private blockedIPs = new Map<string, number>(); // IP -> timestamp de déblocage
  
  constructor() {
    // Nettoyage périodique du cache
    setInterval(() => this.cleanup(), 60 * 1000); // Toutes les minutes
  }

  async check(
    identifier: string, 
    configName: keyof typeof RATE_LIMIT_CONFIGS = 'general'
  ): Promise<RateLimitResult> {
    const config = RATE_LIMIT_CONFIGS[configName];
    const now = Date.now();
    const key = this.generateKey(identifier, configName);
    
    // Vérifier si l'IP est bloquée
    const ipAddress = this.extractIPFromIdentifier(identifier);
    if (this.isBlocked(ipAddress)) {
      return {
        allowed: false,
        limit: 0,
        remaining: 0,
        resetTime: new Date(this.blockedIPs.get(ipAddress)!),
        retryAfter: Math.ceil((this.blockedIPs.get(ipAddress)! - now) / 1000)
      };
    }

    // Récupérer ou créer l'entrée
    let entry = this.store.get(key);
    
    if (!entry || now >= entry.resetTime) {
      // Nouvelle fenêtre
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
        windowStart: now
      };
    } else {
      // Incrémenter le compteur
      entry.count++;
    }
    
    this.store.set(key, entry);
    
    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    
    // Détection d'activité suspecte
    if (!allowed) {
      this.handleRateLimitExceeded(ipAddress, configName, entry.count);
    }
    
    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime: new Date(entry.resetTime),
      retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000)
    };
  }

  // Vérification DDoS avec détection de patterns
  async checkDDoS(ipAddress: string): Promise<RateLimitResult> {
    const result = await this.check(`ddos:${ipAddress}`, 'ddos_protection');
    
    if (!result.allowed) {
      // Marquer comme IP suspecte
      this.suspiciousIPs.add(ipAddress);
      
      // Bloquer temporairement après plusieurs violations
      const violations = this.countViolations(ipAddress);
      if (violations > 3) {
        this.blockIP(ipAddress, 5 * 60 * 1000); // 5 minutes
      }
    }
    
    return result;
  }

  // Rate limiting adaptatif basé sur la charge
  async adaptiveCheck(
    identifier: string,
    baseConfig: keyof typeof RATE_LIMIT_CONFIGS = 'general',
    loadFactor: number = 1.0
  ): Promise<RateLimitResult> {
    const config = { ...RATE_LIMIT_CONFIGS[baseConfig] };
    
    // Ajuster les limites selon la charge du système
    if (loadFactor > 0.8) {
      // Charge élevée - réduire les limites
      config.maxRequests = Math.floor(config.maxRequests * 0.7);
    } else if (loadFactor < 0.3) {
      // Charge faible - augmenter les limites
      config.maxRequests = Math.floor(config.maxRequests * 1.5);
    }
    
    return this.customCheck(identifier, config);
  }

  // Rate limiting personnalisé
  async customCheck(
    identifier: string, 
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
    
    let entry = this.store.get(key);
    
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
        windowStart: now
      };
    } else {
      entry.count++;
    }
    
    this.store.set(key, entry);
    
    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    
    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime: new Date(entry.resetTime),
      retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000)
    };
  }

  // Gestion des utilisateurs premium avec limites élevées
  async checkPremium(
    identifier: string,
    isPremium: boolean = false,
    baseConfig: keyof typeof RATE_LIMIT_CONFIGS = 'general'
  ): Promise<RateLimitResult> {
    const config = { ...RATE_LIMIT_CONFIGS[baseConfig] };
    
    if (isPremium) {
      // Utilisateurs premium ont 5x plus de requêtes
      config.maxRequests *= 5;
    }
    
    return this.customCheck(`premium:${isPremium}:${identifier}`, config);
  }

  // Whitelist d'IPs (pour les services internes)
  private whitelistedIPs = new Set([
    '127.0.0.1',
    '::1',
    'localhost'
  ]);

  isWhitelisted(ipAddress: string): boolean {
    return this.whitelistedIPs.has(ipAddress);
  }

  addToWhitelist(ipAddress: string): void {
    this.whitelistedIPs.add(ipAddress);
  }

  removeFromWhitelist(ipAddress: string): void {
    this.whitelistedIPs.delete(ipAddress);
  }

  // Gestion du blocage d'IP
  blockIP(ipAddress: string, durationMs: number): void {
    const unblockTime = Date.now() + durationMs;
    this.blockedIPs.set(ipAddress, unblockTime);
    console.warn(`🚨 IP ${ipAddress} blocked for ${durationMs / 1000}s due to rate limit violations`);
  }

  unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);
    this.suspiciousIPs.delete(ipAddress);
  }

  isBlocked(ipAddress: string): boolean {
    const unblockTime = this.blockedIPs.get(ipAddress);
    if (!unblockTime) return false;
    
    if (Date.now() >= unblockTime) {
      this.blockedIPs.delete(ipAddress);
      return false;
    }
    
    return true;
  }

  // Statistiques et monitoring
  getStats(): {
    totalEntries: number;
    suspiciousIPs: number;
    blockedIPs: number;
    topConsumers: Array<{ key: string; count: number; resetTime: Date }>;
  } {
    const entries = Array.from(this.store.entries());
    const topConsumers = entries
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([key, entry]) => ({
        key,
        count: entry.count,
        resetTime: new Date(entry.resetTime)
      }));
    
    return {
      totalEntries: this.store.size,
      suspiciousIPs: this.suspiciousIPs.size,
      blockedIPs: this.blockedIPs.size,
      topConsumers
    };
  }

  // Reset d'un utilisateur spécifique
  reset(identifier: string, configName?: string): void {
    const pattern = configName ? `${configName}:${identifier}` : identifier;
    
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key);
      }
    }
  }

  // Nettoyage du cache
  private cleanup(): void {
    const now = Date.now();
    
    // Nettoyer les entrées expirées
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
    
    // Nettoyer les IPs bloquées expirées
    for (const [ip, unblockTime] of this.blockedIPs.entries()) {
      if (now >= unblockTime) {
        this.blockedIPs.delete(ip);
      }
    }
  }

  // Utilitaires
  private generateKey(identifier: string, configName: string): string {
    return `${configName}:${identifier}`;
  }

  private extractIPFromIdentifier(identifier: string): string {
    // Extraire l'IP de l'identifiant (format: "ip:session" ou juste "ip")
    return identifier.split(':')[0];
  }

  private handleRateLimitExceeded(
    ipAddress: string, 
    configName: string, 
    currentCount: number
  ): void {
    console.warn(`Rate limit exceeded for ${ipAddress} on ${configName}: ${currentCount} requests`);
    
    // Marquer comme suspect si dépassement répété
    if (currentCount > RATE_LIMIT_CONFIGS[configName].maxRequests * 2) {
      this.suspiciousIPs.add(ipAddress);
    }
  }

  private countViolations(ipAddress: string): number {
    let violations = 0;
    
    for (const [key, entry] of this.store.entries()) {
      if (key.includes(ipAddress)) {
        const config = this.getConfigFromKey(key);
        if (entry.count > config.maxRequests) {
          violations++;
        }
      }
    }
    
    return violations;
  }

  private getConfigFromKey(key: string): RateLimitConfig {
    const configName = key.split(':')[0] as keyof typeof RATE_LIMIT_CONFIGS;
    return RATE_LIMIT_CONFIGS[configName] || RATE_LIMIT_CONFIGS.general;
  }

  // Méthodes pour les tests de charge
  simulateLoad(concurrent: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let requestCount = 0;
      
      const makeRequest = async () => {
        const testIP = `test.${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 1000)}`;
        await this.check(testIP, 'general');
        requestCount++;
      };
      
      const interval = setInterval(async () => {
        if (Date.now() - startTime >= duration) {
          clearInterval(interval);
          console.log(`Load test completed: ${requestCount} requests in ${duration}ms with ${concurrent} concurrent users`);
          resolve();
          return;
        }
        
        // Lancer plusieurs requêtes en parallèle
        const promises = Array(concurrent).fill(null).map(() => makeRequest());
        await Promise.all(promises);
      }, 100); // Toutes les 100ms
    });
  }
}

// Instance globale
export const rateLimit = new RateLimiter();

// Middleware pour Express/Next.js
export function createRateLimitMiddleware(
  configName: keyof typeof RATE_LIMIT_CONFIGS = 'general'
) {
  return async (req: any, res: any, next: any) => {
    const identifier = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Bypass pour les IPs whitelisées
    if (rateLimit.isWhitelisted(identifier)) {
      return next();
    }
    
    try {
      const result = await rateLimit.check(identifier, configName);
      
      // Ajouter les headers de rate limiting
      res.set({
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toISOString()
      });
      
      if (!result.allowed) {
        res.set('Retry-After', result.retryAfter?.toString() || '60');
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // En cas d'erreur, laisser passer la requête
    }
  };
}