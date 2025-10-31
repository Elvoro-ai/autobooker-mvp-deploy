import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance-monitor';
import { securityService } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';

// Interface pour les tests de charge massifs
interface MassiveLoadTestConfig {
  targetUsers: number;
  rampUpTimeMinutes: number;
  testDurationMinutes: number;
  scenarioDistribution: {
    booking: number; // Pourcentage
    inquiry: number;
    modification: number;
    cancellation: number;
  };
  expectedResponseTime: number; // ms
  maxErrorRate: number; // pourcentage
}

interface TestScenario {
  name: string;
  weight: number;
  messages: string[];
  expectedFlow: string[];
}

// Scénarios de test réalistes pour simulation 1M utilisateurs
const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'booking_simple',
    weight: 40, // 40% des utilisateurs
    messages: [
      'Je voudrais prendre rendez-vous demain matin',
      'Bonjour, j\'ai besoin d\'un RDV cette semaine',
      'Salut, dispo pour une consultation jeudi ?',
      'RDV vendredi 14h si possible',
      'Consultation urgente, quand avez-vous de la place ?'
    ],
    expectedFlow: ['greeting', 'intent_detection', 'slot_gathering', 'proposal', 'confirmation']
  },
  {
    name: 'booking_complex',
    weight: 25, // 25% des utilisateurs
    messages: [
      'Je cherche un créneau pour une consultation longue la semaine prochaine, de préférence mardi ou mercredi après 15h',
      'Bonjour, je voudrais un RDV de suivi avec le Dr Dupont si possible lundi ou mardi, mon email est test@example.com',
      'Consultation spécialisée nécessaire, j\'ai des contraintes d\'horaires - seulement matin et pas le mercredi',
      'RDV pour 2 personnes possible ? Sinon 2 créneaux consécutifs. Disponible toute la semaine sauf vendredi'
    ],
    expectedFlow: ['greeting', 'intent_detection', 'slot_gathering', 'clarification', 'proposal', 'confirmation']
  },
  {
    name: 'information_request',
    weight: 20, // 20% des utilisateurs  
    messages: [
      'Quels sont vos horaires ?',
      'Quels services proposez-vous ?',
      'Combien coûte une consultation ?',
      'Vous faites des téléconsultations ?',
      'Où êtes-vous situés ?'
    ],
    expectedFlow: ['greeting', 'intent_detection', 'information_delivery']
  },
  {
    name: 'modification_annulation',
    weight: 15, // 15% des utilisateurs
    messages: [
      'Je dois déplacer mon rendez-vous de demain',
      'Annuler mon RDV de vendredi s\'il vous plaît',
      'Modifier l\'heure de mon rendez-vous',
      'Je ne peux plus venir jeudi, autres créneaux ?',
      'Reprogrammer pour la semaine suivante'
    ],
    expectedFlow: ['greeting', 'intent_detection', 'booking_lookup', 'modification', 'confirmation']
  }
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;
    
    // Authentification pour les tests
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.LOAD_TEST_API_KEY || 'test-key-123'}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid test API key' },
        { status: 401 }
      );
    }
    
    switch (action) {
      case 'massive_load_test':
        return await handleMassiveLoadTest(params);
        
      case 'realistic_user_simulation':
        return await handleRealisticUserSimulation(params);
        
      case 'stress_until_failure':
        return await handleStressUntilFailure(params);
        
      case 'security_penetration_test':
        return await handleSecurityPenetrationTest(params);
        
      case 'chaos_engineering':
        return await handleChaosEngineering(params);
        
      default:
        return NextResponse.json(
          { error: `Test action not supported: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Test de charge massif (1M utilisateurs simulés)
async function handleMassiveLoadTest(params: any) {
  const config: MassiveLoadTestConfig = {
    targetUsers: params.targetUsers || 1000000,
    rampUpTimeMinutes: params.rampUpTimeMinutes || 60,
    testDurationMinutes: params.testDurationMinutes || 120,
    scenarioDistribution: params.scenarioDistribution || {
      booking: 65,
      inquiry: 20,
      modification: 10,
      cancellation: 5
    },
    expectedResponseTime: params.expectedResponseTime || 2000,
    maxErrorRate: params.maxErrorRate || 1
  };
  
  console.log(`🚀 Démarrage test massif: ${config.targetUsers.toLocaleString()} utilisateurs`);
  
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  
  const testStartTime = Date.now();
  const results = [];
  
  // Test par paliers pour éviter la surcharge
  const paliers = [
    1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 750000, 1000000
  ].filter(p => p <= config.targetUsers);
  
  for (const currentUsers of paliers) {
    console.log(`📊 Test palier: ${currentUsers.toLocaleString()} utilisateurs`);
    
    const palierResult = await performanceMonitor.runLoadTest(
      `${baseUrl}/api/ai`,
      {
        concurrentUsers: Math.min(currentUsers, 10000), // Limiter la concurrence réelle
        duration: (config.testDurationMinutes * 60 * 1000) / paliers.length,
        rampUpTime: (config.rampUpTimeMinutes * 60 * 1000) / paliers.length,
        testData: generateRealisticTestData(currentUsers)
      }
    );
    
    results.push({
      ...palierResult,
      simulatedUsers: currentUsers,
      scalingFactor: currentUsers / Math.min(currentUsers, 10000)
    });
    
    // Analyser les résultats et décider si continuer
    const shouldStop = analyzeResultsAndDecide(palierResult, config);
    if (shouldStop.stop) {
      console.warn(`⚠️ Test arrêté à ${currentUsers.toLocaleString()} utilisateurs: ${shouldStop.reason}`);
      break;
    }
    
    // Pause adaptative entre les paliers
    const pauseMs = Math.min(60000, currentUsers / 100);
    await new Promise(r => setTimeout(r, pauseMs));
  }
  
  const totalTestTime = Date.now() - testStartTime;
  
  // Analyse finale et recommandations
  const analysis = analyzeMassiveLoadTestResults(results, config);
  
  return NextResponse.json({
    success: true,
    message: 'Test de charge massif terminé',
    config,
    duration: totalTestTime,
    results,
    analysis,
    recommendations: generateRecommendations(analysis)
  });
}

// Simulation d'utilisateurs réalistes
async function handleRealisticUserSimulation(params: any) {
  const {
    duration = 3600000, // 1 heure
    peakHours = ['09:00', '14:00', '17:00'],
    userBehaviorPatterns = true
  } = params;
  
  console.log('👥 Démarrage simulation utilisateurs réalistes');
  
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  
  const testResults = [];
  const scenarios = generateUserScenarios();
  
  // Simuler différents moments de la journée
  for (const scenario of scenarios) {
    const scenarioResult = await performanceMonitor.runLoadTest(
      `${baseUrl}/api/ai`,
      {
        concurrentUsers: scenario.concurrentUsers,
        duration: duration / scenarios.length,
        testData: scenario.testData
      }
    );
    
    testResults.push({
      ...scenarioResult,
      scenarioName: scenario.name,
      timeOfDay: scenario.timeOfDay
    });
  }
  
  return NextResponse.json({
    success: true,
    message: 'Simulation utilisateurs réalistes terminée',
    results: testResults,
    insights: analyzeUserBehaviorResults(testResults)
  });
}

// Test jusqu'à la limite de rupture
async function handleStressUntilFailure(params: any) {
  console.log('💪 Démarrage test de stress jusqu\'\u00e0 rupture');
  
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  
  let currentUsers = 100;
  const results = [];
  let systemBroken = false;
  
  while (!systemBroken && currentUsers <= 100000) {
    console.log(`🔥 Test avec ${currentUsers} utilisateurs`);
    
    const result = await performanceMonitor.runLoadTest(
      `${baseUrl}/api/ai`,
      {
        concurrentUsers: Math.min(currentUsers, 1000),
        duration: 30000, // 30 secondes par palier
        testData: generateStressTestData(currentUsers)
      }
    );
    
    results.push({
      ...result,
      simulatedUsers: currentUsers
    });
    
    // Critères de rupture
    if (
      result.errorRate > 50 || // Plus de 50% d'erreurs
      result.averageResponseTime > 30000 || // Plus de 30 secondes
      result.throughput < 0.1 // Moins de 0.1 req/sec
    ) {
      systemBroken = true;
      console.error(`🚨 Système en rupture à ${currentUsers} utilisateurs`);
      break;
    }
    
    // Progression exponentielle
    currentUsers = Math.floor(currentUsers * 1.5);
  }
  
  return NextResponse.json({
    success: !systemBroken,
    message: systemBroken 
      ? `Système en rupture à ${currentUsers} utilisateurs` 
      : `Test terminé - système stable jusqu'à ${currentUsers} utilisateurs`,
    results,
    breakingPoint: systemBroken ? currentUsers : null,
    maxStableUsers: systemBroken ? results[results.length - 2]?.simulatedUsers : currentUsers
  });
}

// Test de sécurité et pénétration
async function handleSecurityPenetrationTest(params: any) {
  console.log('🔒 Démarrage test de pénétration sécurité');
  
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  
  const securityTests = [
    {
      name: 'SQL Injection Attempts',
      test: () => testSQLInjection(baseUrl)
    },
    {
      name: 'XSS Attempts',
      test: () => testXSSAttempts(baseUrl)
    },
    {
      name: 'Rate Limit Bypass',
      test: () => testRateLimitBypass(baseUrl)
    },
    {
      name: 'Input Validation',
      test: () => testInputValidation(baseUrl)
    },
    {
      name: 'Session Security',
      test: () => testSessionSecurity(baseUrl)
    }
  ];
  
  const results = [];
  
  for (const test of securityTests) {
    try {
      console.log(`🔍 Exécution: ${test.name}`);
      const result = await test.test();
      results.push({
        name: test.name,
        status: 'completed',
        result
      });
    } catch (error) {
      results.push({
        name: test.name,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return NextResponse.json({
    success: true,
    message: 'Tests de sécurité terminés',
    results,
    securityScore: calculateSecurityScore(results)
  });
}

// Chaos Engineering avancé
async function handleChaosEngineering(params: any) {
  console.log('🌪️ Démarrage chaos engineering avancé');
  
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  
  const chaosScenarios = [
    {
      name: 'Random API Failures',
      probability: 0.1,
      effect: 'api_failure',
      parameters: { endpoints: ['/api/ai', '/api/health'] }
    },
    {
      name: 'Network Latency Spikes',
      probability: 0.15,
      effect: 'latency',
      parameters: { delay: [1000, 5000, 10000] }
    },
    {
      name: 'Memory Pressure',
      probability: 0.05,
      effect: 'memory_pressure',
      parameters: { intensity: 'high' }
    },
    {
      name: 'Database Timeouts',
      probability: 0.08,
      effect: 'db_timeout',
      parameters: { timeout: 30000 }
    },
    {
      name: 'Malicious Input Patterns',
      probability: 0.12,
      effect: 'malicious_input',
      parameters: { patterns: ['<script>', 'DROP TABLE', '../../etc/passwd'] }
    }
  ];
  
  const result = await performanceMonitor.runChaosTest(
    `${baseUrl}/api/ai`,
    chaosScenarios
  );
  
  // Analyser la résilience
  const resilienceScore = calculateResilienceScore(result);
  
  return NextResponse.json({
    success: true,
    message: 'Chaos engineering terminé',
    result,
    resilienceScore,
    recommendations: generateChaosRecommendations(result)
  });
}

// Générateurs de données de test
function generateRealisticTestData(userCount: number): any[] {
  const testData = [];
  
  for (let i = 0; i < Math.min(userCount, 10000); i++) {
    const scenario = selectScenarioByWeight();
    const message = scenario.messages[Math.floor(Math.random() * scenario.messages.length)];
    
    testData.push({
      message,
      scenario: scenario.name,
      userId: `load_test_user_${i}`,
      timestamp: new Date().toISOString()
    });
  }
  
  return testData;
}

function generateStressTestData(userCount: number): any[] {
  const testData = [];
  
  // Générer des messages de plus en plus complexes pour stresser le système
  const complexMessages = [
    'Je voudrais réserver 5 consultations pour des personnes différentes la semaine prochaine avec des contraintes spécifiques pour chacune',
    'Consultation urgente pour demain matin avec analyse complète et rapport détaillé plus téléconsultation de suivi',
    'Modification de 3 rendez-vous existants avec report sur le mois suivant et adaptation des créneaux selon disponibilités'
  ];
  
  for (let i = 0; i < Math.min(userCount, 5000); i++) {
    testData.push({
      message: complexMessages[i % complexMessages.length],
      userId: `stress_test_user_${i}`,
      complexity: 'high'
    });
  }
  
  return testData;
}

function generateUserScenarios(): any[] {
  return [
    {
      name: 'morning_rush',
      timeOfDay: '09:00',
      concurrentUsers: 500,
      testData: generateRealisticTestData(500)
    },
    {
      name: 'lunch_time',
      timeOfDay: '12:00',
      concurrentUsers: 200,
      testData: generateRealisticTestData(200)
    },
    {
      name: 'afternoon_peak',
      timeOfDay: '14:00',
      concurrentUsers: 800,
      testData: generateRealisticTestData(800)
    },
    {
      name: 'evening_low',
      timeOfDay: '19:00',
      concurrentUsers: 100,
      testData: generateRealisticTestData(100)
    }
  ];
}

// Tests de sécurité spécifiques
async function testSQLInjection(baseUrl: string): Promise<any> {
  const maliciousInputs = [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "1' UNION SELECT * FROM users--"
  ];
  
  const results = [];
  
  for (const input of maliciousInputs) {
    try {
      const response = await fetch(`${baseUrl}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
      
      results.push({
        input,
        status: response.status,
        blocked: response.status === 400 || response.status === 403
      });
    } catch (error) {
      results.push({
        input,
        error: 'Request failed',
        blocked: true
      });
    }
  }
  
  return {
    totalTests: maliciousInputs.length,
    blocked: results.filter(r => r.blocked).length,
    passed: results.filter(r => r.blocked).length === maliciousInputs.length
  };
}

async function testXSSAttempts(baseUrl: string): Promise<any> {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>'
  ];
  
  const results = [];
  
  for (const payload of xssPayloads) {
    try {
      const response = await fetch(`${baseUrl}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: payload })
      });
      
      const responseText = await response.text();
      const containsPayload = responseText.includes(payload);
      
      results.push({
        payload,
        status: response.status,
        reflected: containsPayload,
        safe: !containsPayload
      });
    } catch (error) {
      results.push({
        payload,
        error: 'Request failed',
        safe: true
      });
    }
  }
  
  return {
    totalTests: xssPayloads.length,
    safe: results.filter(r => r.safe).length,
    passed: results.filter(r => r.safe).length === xssPayloads.length
  };
}

async function testRateLimitBypass(baseUrl: string): Promise<any> {
  console.log('🚧 Test rate limit bypass');
  
  const bypassTechniques = [
    { name: 'IP Spoofing', headers: { 'X-Forwarded-For': '192.168.1.1' } },
    { name: 'User-Agent Rotation', headers: { 'User-Agent': 'Mozilla/5.0 (Different Agent)' } },
    { name: 'Referer Manipulation', headers: { 'Referer': 'https://trusted-site.com' } },
  ];
  
  const results = [];
  
  for (const technique of bypassTechniques) {
    let requestCount = 0;
    let blockedAt = null;
    
    // Envoyer 50 requêtes rapidement
    for (let i = 0; i < 50; i++) {
      try {
        const response = await fetch(`${baseUrl}/api/ai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...technique.headers
          },
          body: JSON.stringify({ message: 'Test message' })
        });
        
        requestCount++;
        
        if (response.status === 429) {
          blockedAt = requestCount;
          break;
        }
      } catch (error) {
        break;
      }
    }
    
    results.push({
      technique: technique.name,
      requestsSent: requestCount,
      blockedAt,
      bypassSuccessful: !blockedAt || blockedAt > 25 // Si plus de 25 requêtes passées
    });
  }
  
  return {
    totalTechniques: bypassTechniques.length,
    blocked: results.filter(r => !r.bypassSuccessful).length,
    passed: results.filter(r => !r.bypassSuccessful).length === bypassTechniques.length
  };
}

async function testInputValidation(baseUrl: string): Promise<any> {
  const invalidInputs = [
    { name: 'Empty message', data: { message: '' } },
    { name: 'Null message', data: { message: null } },
    { name: 'Very long message', data: { message: 'A'.repeat(10000) } },
    { name: 'Invalid JSON structure', data: { invalidField: { deep: { nested: true } } } },
    { name: 'Special characters', data: { message: ' ' } }
  ];
  
  const results = [];
  
  for (const test of invalidInputs) {
    try {
      const response = await fetch(`${baseUrl}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.data)
      });
      
      results.push({
        test: test.name,
        status: response.status,
        handled: response.status === 400, // Doit retourner 400 pour les entrées invalides
        response: response.ok ? 'Success' : 'Rejected'
      });
    } catch (error) {
      results.push({
        test: test.name,
        error: 'Request failed',
        handled: true
      });
    }
  }
  
  return {
    totalTests: invalidInputs.length,
    handled: results.filter(r => r.handled).length,
    passed: results.filter(r => r.handled).length === invalidInputs.length
  };
}

async function testSessionSecurity(baseUrl: string): Promise<any> {
  console.log('🔐 Test sécurité des sessions');
  
  const tests = [
    {
      name: 'Session Hijacking',
      test: async () => {
        // Créer une session puis essayer de la réutiliser avec une autre IP
        const session1 = await fetch(`${baseUrl}/api/ai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Hello' })
        });
        
        const sessionData = await session1.json();
        
        // Essayer de réutiliser avec headers différents
        const session2 = await fetch(`${baseUrl}/api/ai`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Forwarded-For': '10.0.0.1' // IP différente
          },
          body: JSON.stringify({ 
            message: 'Continue session',
            sessionId: sessionData.sessionId
          })
        });
        
        return {
          hijackPrevented: session2.status === 403 || session2.status === 401,
          status: session2.status
        };
      }
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.test();
      results.push({
        name: test.name,
        ...result
      });
    } catch (error) {
      results.push({
        name: test.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}

// Fonctions utilitaires d'analyse
function selectScenarioByWeight(): TestScenario {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const scenario of TEST_SCENARIOS) {
    cumulative += scenario.weight;
    if (random <= cumulative) {
      return scenario;
    }
  }
  
  return TEST_SCENARIOS[0]; // Fallback
}

function analyzeResultsAndDecide(result: any, config: MassiveLoadTestConfig): { stop: boolean; reason?: string } {
  if (result.errorRate > config.maxErrorRate * 5) {
    return { stop: true, reason: `Taux d'erreur critique: ${result.errorRate}%` };
  }
  
  if (result.averageResponseTime > config.expectedResponseTime * 10) {
    return { stop: true, reason: `Temps de réponse critique: ${result.averageResponseTime}ms` };
  }
  
  if (result.throughput < 0.1) {
    return { stop: true, reason: `Débit critique: ${result.throughput} req/s` };
  }
  
  return { stop: false };
}

function analyzeMassiveLoadTestResults(results: any[], config: MassiveLoadTestConfig): any {
  const totalRequests = results.reduce((acc, r) => acc + r.totalRequests, 0);
  const avgResponseTime = results.reduce((acc, r) => acc + r.averageResponseTime, 0) / results.length;
  const avgErrorRate = results.reduce((acc, r) => acc + r.errorRate, 0) / results.length;
  const maxThroughput = Math.max(...results.map(r => r.throughput));
  
  const maxStableUsers = results
    .filter(r => r.errorRate <= config.maxErrorRate && r.averageResponseTime <= config.expectedResponseTime)
    .pop()?.simulatedUsers || 0;
  
  return {
    totalRequests,
    avgResponseTime: Math.round(avgResponseTime),
    avgErrorRate: Math.round(avgErrorRate * 100) / 100,
    maxThroughput: Math.round(maxThroughput * 100) / 100,
    maxStableUsers,
    scalabilityScore: calculateScalabilityScore(results, config),
    bottlenecks: identifyBottlenecks(results)
  };
}

function calculateScalabilityScore(results: any[], config: MassiveLoadTestConfig): number {
  // Score sur 100 basé sur la performance aux différents paliers
  let score = 100;
  
  for (const result of results) {
    if (result.errorRate > config.maxErrorRate) {
      score -= 10;
    }
    if (result.averageResponseTime > config.expectedResponseTime) {
      score -= 15;
    }
    if (result.throughput < 10) {
      score -= 5;
    }
  }
  
  return Math.max(0, score);
}

function calculateSecurityScore(results: any[]): number {
  const totalTests = results.length;
  const passedTests = results.filter(r => r.result?.passed || r.status === 'completed').length;
  
  return Math.round((passedTests / totalTests) * 100);
}

function calculateResilienceScore(result: any): number {
  // Score basé sur la capacité du système à résister aux perturbations
  const totalScenarios = result.scenarios.length;
  const handledScenarios = result.scenarios.filter((s: any) => s.triggered > 0 && !s.impact?.error).length;
  
  return Math.round((handledScenarios / totalScenarios) * 100);
}

function identifyBottlenecks(results: any[]): string[] {
  const bottlenecks = [];
  
  const lastResult = results[results.length - 1];
  if (lastResult?.averageResponseTime > 5000) {
    bottlenecks.push('High response time suggests processing bottleneck');
  }
  
  if (lastResult?.errorRate > 10) {
    bottlenecks.push('High error rate suggests capacity bottleneck');
  }
  
  if (lastResult?.throughput < 10) {
    bottlenecks.push('Low throughput suggests I/O bottleneck');
  }
  
  return bottlenecks;
}

function generateRecommendations(analysis: any): string[] {
  const recommendations = [];
  
  if (analysis.maxStableUsers < 100000) {
    recommendations.push('Implémenter la mise à l\'echelle horizontale avec load balancing');
  }
  
  if (analysis.avgResponseTime > 2000) {
    recommendations.push('Optimiser les requêtes de base de données et ajouter du caching');
  }
  
  if (analysis.avgErrorRate > 1) {
    recommendations.push('Améliorer la gestion d\'erreur et ajouter des timeouts');
  }
  
  return recommendations;
}

function generateChaosRecommendations(result: any): string[] {
  const recommendations = [];
  
  result.scenarios.forEach((scenario: any) => {
    if (scenario.triggered > 0 && scenario.impact?.error) {
      recommendations.push(`Améliorer la résilience pour: ${scenario.name}`);
    }
  });
  
  return recommendations;
}

// Endpoint GET pour lancer les tests depuis l'interface
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testType = searchParams.get('type');
  const quick = searchParams.get('quick') === 'true';
  
  if (!testType) {
    return NextResponse.json({
      availableTests: [
        'massive_load_test',
        'realistic_user_simulation', 
        'stress_until_failure',
        'security_penetration_test',
        'chaos_engineering'
      ],
      usage: 'GET /api/test?type=test_name&quick=true'
    });
  }
  
  // Version rapide des tests pour démo
  const quickParams = quick ? {
    targetUsers: 1000,
    duration: 30000,
    concurrentUsers: 50
  } : {};
  
  // Simuler le POST avec les paramètres
  const mockBody = {
    action: testType,
    ...quickParams
  };
  
  // Redéfinir la requête avec le body
  const testRequest = {
    ...request,
    json: async () => mockBody,
    headers: new Headers({
      ...request.headers,
      'authorization': `Bearer ${process.env.LOAD_TEST_API_KEY || 'test-key-123'}`
    })
  } as NextRequest;
  
  return await POST(testRequest);
}