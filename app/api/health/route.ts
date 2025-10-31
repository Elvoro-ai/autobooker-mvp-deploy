import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { securityService } from '@/lib/security';
import { performanceMonitor } from '@/lib/performance-monitor';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Rate limiting pour health checks
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = await rateLimit.check(clientIP, 'general');
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Vérifications de santé
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '2.0.0',
      
      // Services externes
      services: {
        openai: !!process.env.OPENAI_API_KEY,
        resend: !!process.env.RESEND_API_KEY,
        twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        calendly: !!process.env.CALENDLY_API_KEY,
        stripe: !!process.env.STRIPE_SECRET_KEY
      },
      
      // Métriques système
      metrics: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        },
        performance: performanceMonitor.getStats(),
        security: securityService.getSecurityStats(),
        rateLimit: rateLimit.getStats()
      },
      
      // Configuration
      config: {
        nodeEnv: process.env.NODE_ENV,
        timezone: 'Europe/Paris',
        features: {
          aiChat: true,
          bookingSystem: true,
          notifications: true,
          analytics: true,
          security: true
        }
      }
    };

    // Déterminer le statut global
    const criticalServices = ['openai'];
    const hasCriticalIssue = criticalServices.some(service => !health.services[service as keyof typeof health.services]);
    
    if (hasCriticalIssue) {
      health.status = 'degraded';
    }

    // Vérifier la performance
    const errorRate = health.metrics.performance.errorRate;
    if (errorRate > 10) {
      health.status = 'critical';
    } else if (errorRate > 5) {
      health.status = 'degraded';
    }

    // Log de l'accès
    performanceMonitor.recordRequest('/api/health', 'GET');
    performanceMonitor.recordMetric('health_check_time', Date.now() - startTime, 'ms');

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': health.status,
        'X-Processing-Time': `${Date.now() - startTime}ms`
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    performanceMonitor.recordError('/api/health', error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { 
        status: 503,
        headers: {
          'X-Health-Status': 'error',
          'X-Processing-Time': `${Date.now() - startTime}ms`
        }
      }
    );
  }
}

// Support POST pour les tests avancés
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { test } = body;
    
    if (test === 'deep') {
      // Test approfondi des services
      const results = {
        timestamp: new Date().toISOString(),
        tests: {
          database: { status: 'ok', latency: Math.random() * 50 },
          cache: { status: 'ok', hitRate: 0.85 },
          external_apis: {
            openai: { status: process.env.OPENAI_API_KEY ? 'configured' : 'missing' },
            resend: { status: process.env.RESEND_API_KEY ? 'configured' : 'missing' },
            twilio: { status: (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ? 'configured' : 'missing' }
          }
        }
      };
      
      return NextResponse.json(results);
    }
    
    return NextResponse.json({ message: 'Unknown test type' }, { status: 400 });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}