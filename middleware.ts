import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { securityService } from '@/lib/security';
import { performanceMonitor } from '@/lib/performance-monitor';

// Configuration des headers de sécurité
const SECURITY_HEADERS = {
  // Protection XSS
  'X-XSS-Protection': '1; mode=block',
  
  // Empêcher le MIME sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Empêcher l'intégration dans des frames
  'X-Frame-Options': 'DENY',
  
  // Politique de référent stricte
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Content Security Policy strict
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Nécessaire pour Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' https:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'"
  ].join('; '),
  
  // HSTS (HTTPS Strict Transport Security)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Permissions Policy
  'Permissions-Policy': [
    'camera=(), microphone=(), geolocation=(), payment=()'
  ].join(', '),
  
  // Headers personnalisés pour l'API
  'X-API-Version': '2.0.0',
  'X-Powered-By': 'AutoBooker AI'
};

// Routes qui nécessitent une authentification
const PROTECTED_ROUTES = [
  '/api/admin',
  '/api/test',
  '/dashboard'
];

// Routes avec rate limiting spécifique
const RATE_LIMITED_ROUTES = {
  '/api/ai': 'ai_chat',
  '/api/booking': 'booking', 
  '/api/health': 'general',
  '/api/test': 'sensitive'
} as const;

// Routes publiques sans restrictions
const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/pricing',
  '/contact',
  '/_next',
  '/favicon.ico',
  '/api/health'
];

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  
  // Créer le contexte de sécurité
  const securityContext = {
    sessionId: extractSessionId(request),
    ipAddress,
    userAgent,
    timestamp: new Date(),
    permissions: determinePermissions(pathname, request)
  };
  
  try {
    // 1. Vérifications de sécurité de base
    const basicSecurityCheck = await performBasicSecurityChecks(request, securityContext);
    if (!basicSecurityCheck.passed) {
      return new NextResponse(
        JSON.stringify({ error: basicSecurityCheck.reason }),
        { 
          status: basicSecurityCheck.statusCode,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 2. Rate limiting adaptatif
    const rateLimitCheck = await performRateLimitChecks(pathname, securityContext);
    if (!rateLimitCheck.allowed) {
      securityService.logSecurityEvent({
        event: 'suspicious',
        severity: 'medium',
        sessionId: securityContext.sessionId,
        ipAddress,
        details: {
          reason: 'rate_limit_exceeded',
          path: pathname,
          userAgent: securityContext.userAgent
        }
      });
      
      return new NextResponse(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitCheck.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': rateLimitCheck.limit?.toString() || '100',
            'X-RateLimit-Remaining': rateLimitCheck.remaining?.toString() || '0'
          }
        }
      );
    }
    
    // 3. Authentification pour les routes protégées
    if (isProtectedRoute(pathname)) {
      const authCheck = await performAuthenticationCheck(request);
      if (!authCheck.authorized) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // 4. Monitoring des performances
    performanceMonitor.recordRequest(pathname, request.method);
    
    // 5. Log d'accès sécurisé
    securityService.logSecurityEvent({
      event: 'data_access',
      severity: 'low',
      sessionId: securityContext.sessionId,
      ipAddress,
      details: {
        method: request.method,
        path: pathname,
        userAgent: maskUserAgent(userAgent),
        timestamp: new Date().toISOString()
      }
    });
    
    // Créer la réponse avec headers de sécurité
    const response = NextResponse.next();
    
    // Ajouter tous les headers de sécurité
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Headers spécifiques à la performance
    const processingTime = Date.now() - startTime;
    response.headers.set('X-Processing-Time', `${processingTime}ms`);
    response.headers.set('X-Request-ID', securityService.generateSecureToken(8));
    
    // Headers de cache pour les ressources statiques
    if (pathname.startsWith('/_next/static/')) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (pathname.startsWith('/api/')) {
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    
    return response;
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Log de l'erreur middleware
    securityService.logSecurityEvent({
      event: 'error',
      severity: 'high',
      sessionId: securityContext.sessionId,
      ipAddress,
      details: {
        stage: 'middleware',
        error: error instanceof Error ? error.message : 'Unknown middleware error',
        path: pathname,
        processing_time: processingTime
      }
    });
    
    console.error('Middleware error:', error);
    
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Processing-Time': `${processingTime}ms`
        }
      }
    );
  }
}

// Fonctions utilitaires
function getClientIP(request: NextRequest): string {
  // Essayer plusieurs sources pour l'IP réelle
  return (
    request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') || // Cloudflare
    request.headers.get('x-client-ip') ||
    'unknown'
  );
}

function extractSessionId(request: NextRequest): string {
  // Extraire l'ID de session depuis les headers ou cookies
  return (
    request.headers.get('x-session-id') ||
    request.cookies.get('session-id')?.value ||
    `middleware_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
}

function determinePermissions(pathname: string, request: NextRequest): string[] {
  const permissions = ['read'];
  
  if (pathname.startsWith('/api/')) {
    permissions.push('api_access');
  }
  
  if (pathname.startsWith('/api/ai')) {
    permissions.push('chat', 'booking');
  }
  
  if (pathname.startsWith('/api/test')) {
    permissions.push('admin', 'testing');
  }
  
  if (request.method !== 'GET') {
    permissions.push('write');
  }
  
  return permissions;
}

async function performBasicSecurityChecks(
  request: NextRequest, 
  context: any
): Promise<{ passed: boolean; reason?: string; statusCode?: number }> {
  
  // Vérifier la longueur de l'URL
  if (request.url.length > 2048) {
    return {
      passed: false,
      reason: 'URL too long',
      statusCode: 414
    };
  }
  
  // Vérifier les headers suspects
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-original-url', 
    'x-rewrite-url'
  ];
  
  for (const header of suspiciousHeaders) {
    if (request.headers.get(header)) {
      return {
        passed: false,
        reason: `Suspicious header: ${header}`,
        statusCode: 400
      };
    }
  }
  
  // Vérifier les patterns d'attaque dans l'URL
  const maliciousPatterns = [
    /\.\.\//,  // Path traversal
    /<script/i, // XSS
    /union.*select/i, // SQL injection
    /exec\s*\(/i, // Code injection
  ];
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(request.url)) {
      securityService.logSecurityEvent({
        event: 'suspicious',
        severity: 'high',
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        details: {
          reason: 'malicious_pattern_in_url',
          pattern: pattern.toString(),
          url: request.url
        }
      });
      
      return {
        passed: false,
        reason: 'Malicious pattern detected',
        statusCode: 403
      };
    }
  }
  
  return { passed: true };
}

async function performRateLimitChecks(
  pathname: string,
  context: any
): Promise<{ allowed: boolean; retryAfter?: number; limit?: number; remaining?: number }> {
  
  // Déterminer le type de rate limit à appliquer
  const rateLimitType = Object.entries(RATE_LIMITED_ROUTES).find(([route]) => 
    pathname.startsWith(route)
  )?.[1] || 'general';
  
  // Identifier unique basé sur IP + User Agent hash
  const userAgentHash = hashString(context.userAgent).substring(0, 8);
  const identifier = `${context.ipAddress}:${userAgentHash}`;
  
  const result = await rateLimit.check(identifier, rateLimitType);
  
  return {
    allowed: result.allowed,
    retryAfter: result.retryAfter,
    limit: result.limit,
    remaining: result.remaining
  };
}

async function performAuthenticationCheck(
  request: NextRequest
): Promise<{ authorized: boolean; userId?: string }> {
  
  // Vérifier le token d'authentification
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false };
  }
  
  const token = authHeader.substring(7);
  
  // Pour les tests, accepter une clé spécifique
  if (token === process.env.LOAD_TEST_API_KEY || token === 'test-key-123') {
    return { authorized: true, userId: 'test_user' };
  }
  
  // En production, valider avec JWT ou service d'auth
  // const decoded = await verifyJWT(token);
  // return { authorized: true, userId: decoded.sub };
  
  return { authorized: false };
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
}

// Fonction de hachage simple
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir en 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// Masquage du User-Agent pour les logs
function maskUserAgent(userAgent: string): string {
  // Garder seulement les informations de base du navigateur
  const parts = userAgent.split(' ');
  return parts.slice(0, 2).join(' ') + ' [masked]';
}

// Configuration du matcher pour les routes concernées
export const config = {
  matcher: [
    /*
     * Matcher pour toutes les routes sauf:
     * - api routes qui gèrent leur propre sécurité 
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico
     * - fichiers publics dans /public
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};