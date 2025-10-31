import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance-monitor';
import { securityService } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  services: {
    api: 'online' | 'offline';
    ai: 'online' | 'offline' | 'degraded';
    calendar: 'online' | 'offline' | 'degraded';
    notifications: 'online' | 'offline' | 'degraded';
    security: 'online' | 'offline';
    monitoring: 'online' | 'offline';
  };
  metrics: {
    responseTime: number;
    errorRate: number;
    throughput: number;
    memoryUsage: number;
  };
  security: {
    totalEvents: number;
    criticalEvents: number;
    activeSessions: number;
    rateLimitStats: any;
  };
}

// Endpoint GET pour les health checks
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Récupérer la santé du système
    const systemHealth = performanceMonitor.getSystemHealth();
    const securityStats = securityService.getSecurityStats();
    const rateLimitStats = rateLimit.getStats();
    
    // Tester la connectivité des services externes
    const servicesStatus = await checkExternalServices();
    
    const response: HealthCheckResponse = {
      status: systemHealth.status,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      
      services: {
        api: 'online',
        ai: servicesStatus.ai,
        calendar: servicesStatus.calendar,
        notifications: servicesStatus.notifications,
        security: 'online',
        monitoring: 'online'
      },
      
      metrics: systemHealth.metrics,
      
      security: {
        totalEvents: securityStats.totalEvents,
        criticalEvents: securityStats.criticalEvents,
        activeSessions: securityStats.suspiciousIPs, // Nombre de sessions actives depuis security stats
        rateLimitStats: {
          totalEntries: rateLimitStats.totalEntries,
          suspiciousIPs: rateLimitStats.suspiciousIPs,
          blockedIPs: rateLimitStats.blockedIPs
        }
      }
    };
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json(response, {
      status: systemHealth.status === 'critical' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Processing-Time': `${processingTime}ms`,
        'X-Health-Status': systemHealth.status,
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'critical',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        uptime: process.uptime()
      },
      { 
        status: 503,
        headers: {
          'X-Processing-Time': `${Date.now() - startTime}ms`
        }
      }
    );
  }
}

// Endpoint POST pour lancer des tests de charge
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;
    
    // Authentification simple pour les tests (en production, utiliser une clé API)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.LOAD_TEST_API_KEY || 'test-key'}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    switch (action) {
      case 'load_test':
        return await handleLoadTest(params);
        
      case 'chaos_test':
        return await handleChaosTest(params);
        
      case 'stress_test':
        return await handleStressTest(params);
        
      default:
        return NextResponse.json(
          { error: `Action not supported: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Health endpoint POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Vérification de la connectivité des services externes
async function checkExternalServices(): Promise<{
  ai: 'online' | 'offline' | 'degraded';
  calendar: 'online' | 'offline' | 'degraded';
  notifications: 'online' | 'offline' | 'degraded';
}> {
  const services = {
    ai: 'online' as const,
    calendar: 'online' as const,
    notifications: 'online' as const
  };
  
  // Test de l'IA (endpoint interne)
  try {
    const aiTestStart = Date.now();
    // Test simple sans déclencher de rate limiting
    const testResponse = Math.random() > 0.5; // Simulation
    const aiResponseTime = Date.now() - aiTestStart;
    
    if (aiResponseTime > 5000) services.ai = 'degraded';
    if (aiResponseTime > 10000 || !testResponse) services.ai = 'offline';
  } catch {
    services.ai = 'offline';
  }
  
  // Test du calendrier (Google/Outlook)
  try {
    if (process.env.GOOGLE_CALENDAR_ID || process.env.OUTLOOK_CALENDAR_ID) {
      // En production, faire un ping vers les APIs externes
      const calendarTestTime = Date.now();
      // Simulation de test
      await new Promise(r => setTimeout(r, 100));
      const calendarResponseTime = Date.now() - calendarTestTime;
      
      if (calendarResponseTime > 2000) services.calendar = 'degraded';
    }
  } catch {
    services.calendar = 'offline';
  }
  
  // Test des notifications (Resend/Twilio)
  try {
    if (process.env.RESEND_API_KEY || process.env.TWILIO_ACCOUNT_SID) {
      // En production, faire un ping vers les services de notification
      const notifTestTime = Date.now();
      // Simulation de test
      await new Promise(r => setTimeout(r, 50));
      const notifResponseTime = Date.now() - notifTestTime;
      
      if (notifResponseTime > 3000) services.notifications = 'degraded';
    }
  } catch {
    services.notifications = 'offline';
  }
  
  return services;
}

// Gestionnaire de test de charge
async function handleLoadTest(params: any) {
  const {
    concurrentUsers = 100,
    duration = 60000, // 1 minute
    targetEndpoint = '/api/ai'
  } = params;
  
  console.log(`🚀 Lancement test de charge: ${concurrentUsers} utilisateurs pendant ${duration}ms`);
  
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  
  const result = await performanceMonitor.runLoadTest(
    `${baseUrl}${targetEndpoint}`,
    { concurrentUsers, duration }
  );
  
  return NextResponse.json({
    success: true,
    message: 'Test de charge terminé',
    result
  });
}

// Gestionnaire de test de chaos
async function handleChaosTest(params: any) {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  
  const scenarios = params.scenarios || [
    {
      name: 'Latence élevée',
      probability: 0.1,
      effect: 'delay',
      parameters: { delay: 5000 }
    },
    {
      name: 'Données malformées',
      probability: 0.05,
      effect: 'malformed_data'
    },
    {
      name: 'Endpoints inexistants',
      probability: 0.03,
      effect: 'error'
    }
  ];
  
  const result = await performanceMonitor.runChaosTest(
    `${baseUrl}/api/ai`,
    scenarios
  );
  
  return NextResponse.json({
    success: true,
    message: 'Test de chaos terminé',
    result
  });
}

// Gestionnaire de test de stress
async function handleStressTest(params: any) {
  const {
    maxUsers = 1000,
    rampUpTime = 60000, // 1 minute
    duration = 300000 // 5 minutes
  } = params;
  
  console.log(`💪 Lancement test de stress: jusqu'à ${maxUsers} utilisateurs`);
  
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  
  // Test progressif par paliers
  const results = [];
  const steps = [100, 250, 500, 750, maxUsers];
  
  for (const users of steps) {
    if (users > maxUsers) break;
    
    console.log(`📊 Test avec ${users} utilisateurs concurrents`);
    
    const stepResult = await performanceMonitor.runLoadTest(
      `${baseUrl}/api/ai`,
      {
        concurrentUsers: users,
        duration: duration / steps.length,
        rampUpTime: rampUpTime / steps.length
      }
    );
    
    results.push(stepResult);
    
    // Arrêter si le système devient instable
    if (stepResult.errorRate > 20 || stepResult.averageResponseTime > 10000) {
      console.warn(`⚠️ Test arrêté à ${users} utilisateurs - système instable`);
      break;
    }
    
    // Pause entre les paliers
    await new Promise(r => setTimeout(r, 10000));
  }
  
  return NextResponse.json({
    success: true,
    message: 'Test de stress terminé',
    results,
    summary: {
      maxStableUsers: results[results.length - 1]?.concurrentUsers || 0,
      finalErrorRate: results[results.length - 1]?.errorRate || 0,
      finalResponseTime: results[results.length - 1]?.averageResponseTime || 0
    }
  });
}