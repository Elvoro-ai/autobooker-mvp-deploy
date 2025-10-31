"use server";

// Types pour le monitoring des performances
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: Date;
  metrics: {
    responseTime: number;
    errorRate: number;
    throughput: number;
    memoryUsage: number;
    cpuUsage?: number;
  };
  services: {
    ai: 'online' | 'offline' | 'degraded';
    calendar: 'online' | 'offline' | 'degraded';
    notifications: 'online' | 'offline' | 'degraded';
    database: 'online' | 'offline' | 'degraded';
  };
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  duration: number; // Durée en ms avant déclenchement
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  lastTriggered?: Date;
}

export interface LoadTestResult {
  testId: string;
  duration: number;
  concurrentUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // req/sec
  errorRate: number;
  breakdown: {
    [endpoint: string]: {
      requests: number;
      avgTime: number;
      errors: number;
    };
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private responseTimes: number[] = [];
  private errorCounts = new Map<string, number>();
  private requestCounts = new Map<string, number>();
  private alerts: AlertRule[] = [];
  private loadTests: LoadTestResult[] = [];
  
  private readonly MAX_METRICS = 10000; // Limite pour éviter l'explosion mémoire
  private readonly MAX_RESPONSE_TIMES = 1000;

  constructor() {
    // Initialiser les règles d'alerte par défaut
    this.setupDefaultAlerts();
    
    // Nettoyage périodique
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // Toutes les 5 minutes
    
    // Collecte de métriques périodique
    setInterval(() => this.collectSystemMetrics(), 30 * 1000); // Toutes les 30 secondes
  }

  // Enregistrement des métriques
  recordMetric(name: string, value: number, unit: string = 'count', tags: Record<string, string> = {}): void {
    const metric: PerformanceMetric = {
      id: `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };
    
    this.metrics.push(metric);
    
    // Maintenir la limite
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
    
    // Vérifier les alertes
    this.checkAlerts(metric);
  }

  // Mesure du temps de réponse
  measureResponseTime<T>(fn: () => Promise<T>, operation: string): Promise<T & { __performanceData?: any }> {
    const startTime = Date.now();
    
    return fn().then(result => {
      const responseTime = Date.now() - startTime;
      
      this.recordMetric('response_time', responseTime, 'ms', { operation });
      this.responseTimes.push(responseTime);
      
      if (this.responseTimes.length > this.MAX_RESPONSE_TIMES) {
        this.responseTimes = this.responseTimes.slice(-this.MAX_RESPONSE_TIMES);
      }
      
      return result;
    }).catch(error => {
      const responseTime = Date.now() - startTime;
      
      this.recordMetric('response_time', responseTime, 'ms', { operation, status: 'error' });
      this.recordError(operation, error.message);
      
      throw error;
    });
  }

  // Enregistrement des erreurs
  recordError(operation: string, errorMessage: string): void {
    const key = `${operation}:${errorMessage}`;
    const currentCount = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, currentCount + 1);
    
    this.recordMetric('error_count', 1, 'count', { operation, error: errorMessage });
  }

  // Enregistrement des requêtes
  recordRequest(endpoint: string, method: string = 'POST'): void {
    const key = `${method}:${endpoint}`;
    const currentCount = this.requestCounts.get(key) || 0;
    this.requestCounts.set(key, currentCount + 1);
    
    this.recordMetric('request_count', 1, 'count', { endpoint, method });
  }

  // Test de charge avancé
  async runLoadTest(
    targetUrl: string,
    options: {
      concurrentUsers: number;
      duration: number; // en ms
      rampUpTime?: number;
      testData?: any[];
    }
  ): Promise<LoadTestResult> {
    const testId = `load_test_${Date.now()}`;
    const startTime = Date.now();
    const { concurrentUsers, duration, rampUpTime = 1000, testData = [] } = options;
    
    console.log(`🚀 Démarrage du test de charge: ${concurrentUsers} utilisateurs pour ${duration}ms`);
    
    const results = {
      testId,
      duration,
      concurrentUsers,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [] as number[],
      breakdown: {} as Record<string, { requests: number; avgTime: number; errors: number }>
    };

    // Fonction pour simuler une requête utilisateur
    const simulateUserRequest = async (userId: number): Promise<void> => {
      const requestStart = Date.now();
      
      try {
        // Utiliser testData si fourni, sinon générer des données aléatoires
        const testMessage = testData[userId % testData.length]?.message || 
          this.generateRandomTestMessage();
        
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': `LoadTest-User-${userId}`
          },
          body: JSON.stringify({
            message: testMessage,
            sessionId: `load_test_${testId}_user_${userId}`
          })
        });
        
        const responseTime = Date.now() - requestStart;
        results.totalRequests++;
        results.responseTimes.push(responseTime);
        
        if (response.ok) {
          results.successfulRequests++;
        } else {
          results.failedRequests++;
          console.warn(`Request failed: ${response.status} ${response.statusText}`);
        }
        
        // Enregistrer dans breakdown
        const endpoint = 'ai_chat';
        if (!results.breakdown[endpoint]) {
          results.breakdown[endpoint] = { requests: 0, avgTime: 0, errors: 0 };
        }
        
        results.breakdown[endpoint].requests++;
        results.breakdown[endpoint].avgTime = 
          (results.breakdown[endpoint].avgTime * (results.breakdown[endpoint].requests - 1) + responseTime) / 
          results.breakdown[endpoint].requests;
        
        if (!response.ok) {
          results.breakdown[endpoint].errors++;
        }
        
      } catch (error) {
        results.totalRequests++;
        results.failedRequests++;
        console.error(`Load test request error:`, error);
      }
    };

    // Lancement progressif des utilisateurs (ramp-up)
    const userPromises: Promise<void>[] = [];
    
    for (let i = 0; i < concurrentUsers; i++) {
      const delay = (rampUpTime / concurrentUsers) * i;
      
      const userPromise = new Promise<void>((resolve) => {
        setTimeout(async () => {
          const userStartTime = Date.now();
          
          // Chaque utilisateur fait des requêtes pendant la durée du test
          while (Date.now() - userStartTime < duration) {
            await simulateUserRequest(i);
            
            // Pause aléatoire entre les requêtes (1-5 secondes)
            const pauseMs = Math.random() * 4000 + 1000;
            await new Promise(r => setTimeout(r, pauseMs));
          }
          
          resolve();
        }, delay);
      });
      
      userPromises.push(userPromise);
    }

    // Attendre la fin de tous les utilisateurs
    await Promise.all(userPromises);
    
    // Calculer les statistiques finales
    const totalDuration = Date.now() - startTime;
    const sortedResponseTimes = results.responseTimes.sort((a, b) => a - b);
    
    const finalResult: LoadTestResult = {
      testId,
      duration: totalDuration,
      concurrentUsers,
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      averageResponseTime: results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length || 0,
      p95ResponseTime: sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.95)] || 0,
      p99ResponseTime: sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.99)] || 0,
      throughput: results.totalRequests / (totalDuration / 1000),
      errorRate: (results.failedRequests / results.totalRequests) * 100 || 0,
      breakdown: results.breakdown
    };
    
    this.loadTests.push(finalResult);
    
    console.log(`🏁 Test de charge terminé:`, {
      duration: `${totalDuration}ms`,
      requests: finalResult.totalRequests,
      success_rate: `${((finalResult.successfulRequests / finalResult.totalRequests) * 100).toFixed(2)}%`,
      avg_response: `${finalResult.averageResponseTime.toFixed(2)}ms`,
      throughput: `${finalResult.throughput.toFixed(2)} req/s`
    });
    
    return finalResult;
  }

  // Test de résilience (chaos engineering)
  async runChaosTest(
    targetUrl: string,
    scenarios: Array<{
      name: string;
      probability: number; // 0-1
      effect: 'delay' | 'error' | 'timeout' | 'malformed_data';
      parameters?: any;
    }>
  ): Promise<{
    testId: string;
    scenarios: Array<{ name: string; triggered: number; impact: any }>;
  }> {
    const testId = `chaos_test_${Date.now()}`;
    const results = scenarios.map(scenario => ({ 
      name: scenario.name, 
      triggered: 0, 
      impact: {} 
    }));
    
    console.log(`🌪️ Démarrage du test de chaos: ${scenarios.length} scénarios`);
    
    // Exécuter le test pendant 60 secondes
    const testDuration = 60 * 1000;
    const testStart = Date.now();
    
    while (Date.now() - testStart < testDuration) {
      for (const [index, scenario] of scenarios.entries()) {
        if (Math.random() < scenario.probability) {
          results[index].triggered++;
          
          try {
            switch (scenario.effect) {
              case 'delay':
                await new Promise(r => setTimeout(r, scenario.parameters?.delay || 5000));
                break;
                
              case 'malformed_data':
                await fetch(targetUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ invalid: 'data', nested: { deep: { malformed: true } } })
                });
                break;
                
              case 'error':
                // Simuler une erreur réseau
                await fetch(targetUrl + '/nonexistent', { method: 'POST' });
                break;
            }
          } catch (error) {
            // Les erreurs sont attendues dans un test de chaos
            results[index].impact = { error: error.message };
          }
        }
      }
      
      // Pause entre les itérations
      await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log(`🌪️ Test de chaos terminé:`, results);
    
    return { testId, scenarios: results };
  }

  // Collecte des métriques système
  private async collectSystemMetrics(): Promise<void> {
    const memUsage = process.memoryUsage();
    
    // Mémoire
    this.recordMetric('memory_heap_used', memUsage.heapUsed / 1024 / 1024, 'MB');
    this.recordMetric('memory_heap_total', memUsage.heapTotal / 1024 / 1024, 'MB');
    this.recordMetric('memory_rss', memUsage.rss / 1024 / 1024, 'MB');
    
    // Uptime
    this.recordMetric('uptime', process.uptime(), 'seconds');
    
    // Statistiques des temps de réponse
    if (this.responseTimes.length > 0) {
      const sorted = [...this.responseTimes].sort((a, b) => a - b);
      const avg = this.responseTimes.reduce((a, b) => a + b) / this.responseTimes.length;
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      
      this.recordMetric('response_time_avg', avg, 'ms');
      this.recordMetric('response_time_p95', p95, 'ms');
      this.recordMetric('response_time_p99', p99, 'ms');
    }
    
    // Taux d'erreur
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    const totalRequests = Array.from(this.requestCounts.values()).reduce((a, b) => a + b, 0);
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    
    this.recordMetric('error_rate', errorRate, 'percent');
  }

  // Configuration des alertes par défaut
  private setupDefaultAlerts(): void {
    this.alerts = [
      {
        id: 'high_response_time',
        name: 'Temps de réponse élevé',
        metric: 'response_time_avg',
        condition: 'greater_than',
        threshold: 2000, // 2 secondes
        duration: 60000, // 1 minute
        severity: 'medium',
        enabled: true
      },
      {
        id: 'critical_response_time',
        name: 'Temps de réponse critique',
        metric: 'response_time_avg',
        condition: 'greater_than',
        threshold: 5000, // 5 secondes
        duration: 30000, // 30 secondes
        severity: 'critical',
        enabled: true
      },
      {
        id: 'high_error_rate',
        name: 'Taux d\'erreur élevé',
        metric: 'error_rate',
        condition: 'greater_than',
        threshold: 5, // 5%
        duration: 120000, // 2 minutes
        severity: 'high',
        enabled: true
      },
      {
        id: 'memory_usage_high',
        name: 'Utilisation mémoire élevée',
        metric: 'memory_heap_used',
        condition: 'greater_than',
        threshold: 512, // 512 MB
        duration: 300000, // 5 minutes
        severity: 'medium',
        enabled: true
      }
    ];
  }

  // Vérification des alertes
  private checkAlerts(metric: PerformanceMetric): void {
    for (const alert of this.alerts) {
      if (!alert.enabled || alert.metric !== metric.name) continue;
      
      let shouldTrigger = false;
      
      switch (alert.condition) {
        case 'greater_than':
          shouldTrigger = metric.value > alert.threshold;
          break;
        case 'less_than':
          shouldTrigger = metric.value < alert.threshold;
          break;
        case 'equals':
          shouldTrigger = metric.value === alert.threshold;
          break;
      }
      
      if (shouldTrigger) {
        const now = Date.now();
        const lastTriggered = alert.lastTriggered?.getTime() || 0;
        
        // Vérifier si assez de temps s'est écoulé depuis la dernière alerte
        if (now - lastTriggered >= alert.duration) {
          this.triggerAlert(alert, metric);
          alert.lastTriggered = new Date();
        }
      }
    }
  }

  // Déclenchement d'alerte
  private triggerAlert(alert: AlertRule, metric: PerformanceMetric): void {
    const alertData = {
      id: alert.id,
      name: alert.name,
      severity: alert.severity,
      metric: metric.name,
      value: metric.value,
      threshold: alert.threshold,
      timestamp: new Date()
    };
    
    console.warn(`🚨 ALERTE ${alert.severity.toUpperCase()}: ${alert.name}`, alertData);
    
    // En production, envoyer vers Slack, email, ou service d'alerting
    this.recordMetric('alert_triggered', 1, 'count', { 
      alert_id: alert.id, 
      severity: alert.severity 
    });
  }

  // Génération de messages de test aléatoires
  private generateRandomTestMessage(): string {
    const messages = [
      'Je voudrais prendre rendez-vous demain à 14h',
      'Bonjour, quels sont vos horaires ?',
      'J\'ai besoin d\'une consultation urgente',
      'Pouvez-vous me proposer un créneau vendredi matin ?',
      'Je souhaite annuler mon rendez-vous',
      'Quels services proposez-vous ?',
      'Je voudrais modifier mon RDV de demain',
      'Avez-vous de la place cette semaine ?',
      'Téléconsultation possible ?',
      'RDV pour consultation longue'
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Rapport de santé du système
  getSystemHealth(): SystemHealth {
    const now = new Date();
    const recentMetrics = this.metrics.filter(m => 
      now.getTime() - m.timestamp.getTime() < 5 * 60 * 1000 // 5 minutes
    );
    
    const responseTimeMetrics = recentMetrics.filter(m => m.name === 'response_time_avg');
    const errorRateMetrics = recentMetrics.filter(m => m.name === 'error_rate');
    
    const avgResponseTime = responseTimeMetrics.length > 0 
      ? responseTimeMetrics.reduce((acc, m) => acc + m.value, 0) / responseTimeMetrics.length 
      : 0;
    
    const currentErrorRate = errorRateMetrics.length > 0 
      ? errorRateMetrics[errorRateMetrics.length - 1].value 
      : 0;
    
    const memUsage = process.memoryUsage();
    const throughput = this.calculateThroughput();
    
    // Déterminer le statut global
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (avgResponseTime > 5000 || currentErrorRate > 10 || memUsage.heapUsed > 1024 * 1024 * 1024) {
      status = 'critical';
    } else if (avgResponseTime > 2000 || currentErrorRate > 5 || memUsage.heapUsed > 512 * 1024 * 1024) {
      status = 'degraded';
    }
    
    return {
      status,
      timestamp: now,
      metrics: {
        responseTime: Math.round(avgResponseTime),
        errorRate: Math.round(currentErrorRate * 100) / 100,
        throughput: Math.round(throughput * 100) / 100,
        memoryUsage: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100
      },
      services: {
        ai: this.getServiceStatus('ai'),
        calendar: this.getServiceStatus('calendar'),
        notifications: this.getServiceStatus('notifications'),
        database: this.getServiceStatus('database')
      }
    };
  }

  // Calcul du débit (throughput)
  private calculateThroughput(): number {
    const now = Date.now();
    const lastMinuteRequests = Array.from(this.requestCounts.entries())
      .reduce((total, [key, count]) => total + count, 0);
    
    return lastMinuteRequests / 60; // req/sec
  }

  // Statut d'un service
  private getServiceStatus(service: string): 'online' | 'offline' | 'degraded' {
    const recentErrors = this.metrics.filter(m => 
      m.name === 'error_count' && 
      m.tags.operation?.includes(service) &&
      Date.now() - m.timestamp.getTime() < 5 * 60 * 1000
    ).length;
    
    if (recentErrors > 10) return 'degraded';
    if (recentErrors > 50) return 'offline';
    return 'online';
  }

  // Nettoyage des anciennes métriques
  private cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 heures
    
    // Nettoyer les métriques anciennes
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff);
    
    // Reset des compteurs périodiques
    this.errorCounts.clear();
    this.requestCounts.clear();
    
    console.log(`🧹 Nettoyage: métriques maintenues à ${this.metrics.length} entrées`);
  }

  // Accès aux données
  getMetrics(name?: string, limit: number = 100): PerformanceMetric[] {
    let filtered = name ? this.metrics.filter(m => m.name === name) : this.metrics;
    return filtered.slice(-limit);
  }

  getLoadTestHistory(): LoadTestResult[] {
    return [...this.loadTests];
  }

  getLatestLoadTest(): LoadTestResult | null {
    return this.loadTests.length > 0 ? this.loadTests[this.loadTests.length - 1] : null;
  }

  // Export des métriques pour monitoring externe
  exportMetrics(format: 'json' | 'prometheus' = 'json'): any {
    if (format === 'prometheus') {
      return this.toPrometheusFormat();
    }
    
    return {
      metrics: this.metrics.slice(-1000),
      health: this.getSystemHealth(),
      loadTests: this.loadTests.slice(-10),
      alerts: this.alerts.filter(a => a.enabled)
    };
  }

  private toPrometheusFormat(): string {
    // TODO: Implémenter le format Prometheus pour intégration avec Grafana
    return '# Metrics will be formatted for Prometheus here';
  }
}

// Instance globale
export const performanceMonitor = new PerformanceMonitor();