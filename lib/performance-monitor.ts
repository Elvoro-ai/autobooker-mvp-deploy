interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
}

interface RequestMetric {
  endpoint: string;
  method: string;
  timestamp: Date;
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private requests: RequestMetric[] = [];
  private maxEntries = 1000;
  
  recordMetric(name: string, value: number, unit: string = '') {
    this.metrics.push({
      name,
      value,
      unit,
      timestamp: new Date()
    });
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxEntries) {
      this.metrics = this.metrics.slice(-this.maxEntries);
    }
  }
  
  recordRequest(endpoint: string, method: string) {
    this.requests.push({
      endpoint,
      method,
      timestamp: new Date()
    });
    
    // Keep only recent requests
    if (this.requests.length > this.maxEntries) {
      this.requests = this.requests.slice(-this.maxEntries);
    }
  }
  
  recordError(endpoint: string, error: string) {
    const existingRequest = this.requests[this.requests.length - 1];
    if (existingRequest && existingRequest.endpoint === endpoint) {
      existingRequest.error = error;
    } else {
      this.requests.push({
        endpoint,
        method: 'ERROR',
        timestamp: new Date(),
        error
      });
    }
  }
  
  getStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    const recentRequests = this.requests.filter(
      r => (now - r.timestamp.getTime()) < oneHour
    );
    
    const errors = recentRequests.filter(r => r.error).length;
    const total = recentRequests.length;
    
    return {
      totalRequests: this.requests.length,
      recentRequests: recentRequests.length,
      errorRate: total > 0 ? (errors / total) * 100 : 0,
      endpoints: [...new Set(recentRequests.map(r => r.endpoint))],
      averageResponseTime: this.getAverageResponseTime()
    };
  }
  
  private getAverageResponseTime(): number {
    const withResponseTime = this.requests.filter(r => r.responseTime);
    if (withResponseTime.length === 0) return 0;
    
    const total = withResponseTime.reduce((sum, r) => sum + (r.responseTime || 0), 0);
    return Math.round(total / withResponseTime.length);
  }
}

export const performanceMonitor = new PerformanceMonitor();