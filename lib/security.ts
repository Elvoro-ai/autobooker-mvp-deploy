export interface SecurityContext {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  permissions: string[];
}

export interface SecurityEvent {
  event: 'data_access' | 'data_modify' | 'auth' | 'suspicious' | 'error';
  severity: 'low' | 'medium' | 'high';
  sessionId: string;
  ipAddress: string;
  details: any;
}

class SecurityService {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000;
  
  logSecurityEvent(event: SecurityEvent) {
    this.events.push({
      ...event,
      timestamp: new Date()
    } as SecurityEvent & { timestamp: Date });
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    
    // Log critical events
    if (event.severity === 'high') {
      console.error('Security Event:', event);
    }
  }
  
  async validateRequest(context: SecurityContext): Promise<{ allowed: boolean; reason?: string }> {
    // Basic validation
    if (!context.sessionId || !context.ipAddress) {
      return { allowed: false, reason: 'Invalid context' };
    }
    
    // Check for suspicious patterns
    const recentEvents = this.events.filter(
      e => e.ipAddress === context.ipAddress && 
           (Date.now() - new Date(e.timestamp as any).getTime()) < 60000
    );
    
    const suspiciousEvents = recentEvents.filter(e => e.event === 'suspicious').length;
    if (suspiciousEvents > 5) {
      return { allowed: false, reason: 'Too many suspicious activities' };
    }
    
    return { allowed: true };
  }
  
  validateAndSanitize(data: any, schema: any): { isValid: boolean; errors?: string[]; sanitizedData?: any } {
    const errors: string[] = [];
    const sanitizedData: any = {};
    
    for (const [key, rules] of Object.entries(schema) as [string, any][]) {
      const value = data[key];
      
      // Check required
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${key} is required`);
        continue;
      }
      
      if (value !== undefined && value !== null && value !== '') {
        // Type validation
        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`${key} must be a string`);
          continue;
        }
        
        if (rules.type === 'number' && typeof value !== 'number') {
          errors.push(`${key} must be a number`);
          continue;
        }
        
        if (rules.type === 'email' && typeof value === 'string') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push(`${key} must be a valid email`);
            continue;
          }
        }
        
        // Length validation
        if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
          errors.push(`${key} must be less than ${rules.maxLength} characters`);
          continue;
        }
        
        if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
          errors.push(`${key} must be at least ${rules.minLength} characters`);
          continue;
        }
        
        // Pattern validation
        if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
          errors.push(`${key} has invalid format`);
          continue;
        }
        
        // Sanitize string values
        if (typeof value === 'string') {
          sanitizedData[key] = value.trim();
        } else {
          sanitizedData[key] = value;
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      sanitizedData
    };
  }
  
  generateSecureToken(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  generateSessionId(): string {
    return `session_${Date.now()}_${this.generateSecureToken(12)}`;
  }
  
  maskPII(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const masked = { ...data };
    
    // Mask common PII fields
    const piiFields = ['email', 'phone', 'address', 'name'];
    
    for (const field of piiFields) {
      if (masked[field]) {
        if (field === 'email' && typeof masked[field] === 'string') {
          const email = masked[field] as string;
          const [local, domain] = email.split('@');
          masked[field] = `${local.substring(0, 2)}***@${domain}`;
        } else if (field === 'phone' && typeof masked[field] === 'string') {
          const phone = masked[field] as string;
          masked[field] = `***${phone.slice(-4)}`;
        } else {
          masked[field] = '***';
        }
      }
    }
    
    return masked;
  }
  
  getSecurityStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    const recentEvents = this.events.filter(
      e => (now - new Date(e.timestamp as any).getTime()) < oneHour
    );
    
    return {
      totalEvents: this.events.length,
      recentEvents: recentEvents.length,
      suspiciousEvents: recentEvents.filter(e => e.event === 'suspicious').length,
      errorEvents: recentEvents.filter(e => e.event === 'error').length
    };
  }
}

export const securityService = new SecurityService();