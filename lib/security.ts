"use server";

import crypto from 'crypto';
import { rateLimit } from './rate-limit';

// Configuration sécurisée
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 12; // Pour GCM
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Types de sécurité
export interface SecurityContext {
  userId?: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  permissions: string[];
}

export interface PIIData {
  email?: string;
  phone?: string;
  name?: string;
  address?: string;
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

export interface SecurityAuditLog {
  id: string;
  event: 'auth' | 'data_access' | 'data_modify' | 'error' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sessionId: string;
  ipAddress: string;
  details: Record<string, any>;
  timestamp: Date;
}

export class SecurityService {
  private auditLogs: SecurityAuditLog[] = [];
  private suspiciousActivity: Map<string, number> = new Map();
  private rateLimiter = rateLimit;

  // Chiffrement des données PII
  encryptPII(data: string): string {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY);
      cipher.setAAD(Buffer.from('autobooker-pii'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
    } catch (error) {
      this.logSecurityEvent({
        event: 'error',
        severity: 'high',
        sessionId: 'system',
        ipAddress: 'internal',
        details: { operation: 'encrypt', error: error.message }
      });
      throw new Error('Encryption failed');
    }
  }

  // Déchiffrement des données PII
  decryptPII(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) throw new Error('Invalid encrypted data format');
      
      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY);
      decipher.setAAD(Buffer.from('autobooker-pii'));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logSecurityEvent({
        event: 'error',
        severity: 'high',
        sessionId: 'system',
        ipAddress: 'internal',
        details: { operation: 'decrypt', error: error.message }
      });
      throw new Error('Decryption failed');
    }
  }

  // Hachage sécurisé pour les identifiants
  hashIdentifier(data: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
    return salt.toString('hex') + ':' + hash.toString('hex');
  }

  // Vérification du hash
  verifyHash(data: string, hashedData: string): boolean {
    const parts = hashedData.split(':');
    if (parts.length !== 2) return false;
    
    const salt = Buffer.from(parts[0], 'hex');
    const hash = Buffer.from(parts[1], 'hex');
    
    const computedHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
    return crypto.timingSafeEqual(hash, computedHash);
  }

  // Validation et assainissement des entrées
  validateAndSanitize(data: any, schema: ValidationSchema): ValidationResult {
    const errors: string[] = [];
    const sanitizedData: any = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      
      // Champ requis
      if (rules.required && (!value || value === '')) {
        errors.push(`${field} est requis`);
        continue;
      }
      
      if (value !== undefined && value !== null && value !== '') {
        // Validation du type
        if (rules.type === 'email' && !this.isValidEmail(value)) {
          errors.push(`${field} doit être un email valide`);
          continue;
        }
        
        if (rules.type === 'phone' && !this.isValidPhone(value)) {
          errors.push(`${field} doit être un numéro de téléphone valide`);
          continue;
        }
        
        if (rules.type === 'date' && !this.isValidDate(value)) {
          errors.push(`${field} doit être une date valide`);
          continue;
        }
        
        // Longueur
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} ne peut pas dépasser ${rules.maxLength} caractères`);
          continue;
        }
        
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} doit contenir au moins ${rules.minLength} caractères`);
          continue;
        }
        
        // Assainissement
        sanitizedData[field] = this.sanitizeInput(value, rules.type);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };
  }

  // Masquage des PII dans les logs
  maskPII(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    
    const masked = { ...data };
    const piiFields = ['email', 'phone', 'name', 'firstName', 'lastName', 'address'];
    
    for (const field of piiFields) {
      if (masked[field]) {
        if (field === 'email') {
          const parts = masked[field].split('@');
          masked[field] = parts[0].substring(0, 2) + '***@' + parts[1];
        } else if (field === 'phone') {
          masked[field] = masked[field].substring(0, 3) + '***' + masked[field].slice(-2);
        } else {
          masked[field] = masked[field].substring(0, 2) + '***';
        }
      }
    }
    
    return masked;
  }

  // Vérification de sécurité des requêtes
  async validateRequest(context: SecurityContext): Promise<{ allowed: boolean; reason?: string }> {
    // Rate limiting
    const rateLimitKey = `${context.ipAddress}:${context.sessionId}`;
    const rateLimitResult = await this.rateLimiter.check(rateLimitKey);
    
    if (!rateLimitResult.allowed) {
      this.logSecurityEvent({
        event: 'suspicious',
        severity: 'medium',
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        details: { reason: 'rate_limit_exceeded', limit: rateLimitResult.limit }
      });
      return { allowed: false, reason: 'Rate limit exceeded' };
    }

    // Détection d'activité suspecte
    const suspiciousCount = this.suspiciousActivity.get(context.ipAddress) || 0;
    if (suspiciousCount > 10) {
      this.logSecurityEvent({
        event: 'suspicious',
        severity: 'high',
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        details: { reason: 'repeated_suspicious_activity', count: suspiciousCount }
      });
      return { allowed: false, reason: 'Suspicious activity detected' };
    }

    // Validation User-Agent
    if (!context.userAgent || context.userAgent.length < 10) {
      this.incrementSuspiciousActivity(context.ipAddress);
      return { allowed: false, reason: 'Invalid user agent' };
    }

    return { allowed: true };
  }

  // Génération de tokens sécurisés
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Génération d'ID de session sécurisé
  generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `sess_${timestamp}_${randomBytes}`;
  }

  // Audit et logging sécurisé
  logSecurityEvent(event: Omit<SecurityAuditLog, 'id' | 'timestamp'>): void {
    const auditLog: SecurityAuditLog = {
      id: this.generateSecureToken(16),
      timestamp: new Date(),
      ...event,
      details: this.maskPII(event.details)
    };
    
    this.auditLogs.push(auditLog);
    
    // En production, envoyer vers un service de logging sécurisé
    console.log(`[SECURITY] ${auditLog.severity.toUpperCase()}: ${auditLog.event}`, {
      id: auditLog.id,
      sessionId: auditLog.sessionId,
      ip: auditLog.ipAddress,
      details: auditLog.details
    });
    
    // Alerte pour événements critiques
    if (auditLog.severity === 'critical') {
      this.sendSecurityAlert(auditLog);
    }
  }

  // Conformité RGPD
  async handleDataSubjectRequest(email: string, requestType: 'access' | 'delete' | 'portability'): Promise<any> {
    this.logSecurityEvent({
      event: 'data_access',
      severity: 'medium',
      sessionId: 'gdpr_request',
      ipAddress: 'internal',
      details: { requestType, email: this.maskPII({ email }).email }
    });
    
    switch (requestType) {
      case 'access':
        // Retourner toutes les données de l'utilisateur
        return await this.exportUserData(email);
      
      case 'delete':
        // Supprimer toutes les données de l'utilisateur
        return await this.deleteUserData(email);
      
      case 'portability':
        // Export des données dans un format portable
        return await this.exportPortableData(email);
      
      default:
        throw new Error('Invalid GDPR request type');
    }
  }

  // Utilitaires de validation
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^(?:\+33|0)[1-9](?:[0-9]{8})$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  private isValidDate(date: string): boolean {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  private sanitizeInput(value: string, type?: string): string {
    // Suppression des caractères dangereux
    let sanitized = value.trim();
    
    // Protection XSS
    sanitized = sanitized
      .replace(/[<>"']/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
    
    // Spécifique au type
    if (type === 'email') {
      sanitized = sanitized.toLowerCase();
    } else if (type === 'phone') {
      sanitized = sanitized.replace(/[^+0-9]/g, '');
    }
    
    return sanitized;
  }

  private incrementSuspiciousActivity(ipAddress: string): void {
    const current = this.suspiciousActivity.get(ipAddress) || 0;
    this.suspiciousActivity.set(ipAddress, current + 1);
  }

  private async sendSecurityAlert(log: SecurityAuditLog): Promise<void> {
    // En production, envoyer vers Slack, email, ou service d'alerting
    console.error('🚨 SECURITY ALERT:', log);
  }

  private async exportUserData(email: string): Promise<any> {
    // Implémentation export RGPD
    return { message: 'User data export not implemented' };
  }

  private async deleteUserData(email: string): Promise<any> {
    // Implémentation suppression RGPD
    return { message: 'User data deletion not implemented' };
  }

  private async exportPortableData(email: string): Promise<any> {
    // Implémentation portabilité RGPD
    return { message: 'Portable data export not implemented' };
  }

  // Méthodes publiques pour l'audit
  getAuditLogs(severity?: string, limit: number = 100): SecurityAuditLog[] {
    let logs = [...this.auditLogs].reverse();
    
    if (severity) {
      logs = logs.filter(log => log.severity === severity);
    }
    
    return logs.slice(0, limit);
  }

  getSecurityStats(): { totalEvents: number; criticalEvents: number; suspiciousIPs: number } {
    return {
      totalEvents: this.auditLogs.length,
      criticalEvents: this.auditLogs.filter(log => log.severity === 'critical').length,
      suspiciousIPs: this.suspiciousActivity.size
    };
  }
}

// Schéma de validation
export interface ValidationSchema {
  [field: string]: {
    required?: boolean;
    type?: 'string' | 'email' | 'phone' | 'date' | 'number';
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  };
}

// Instance globale
export const securityService = new SecurityService();

// Middleware de sécurité pour les API
export function createSecurityMiddleware() {
  return async (request: Request, context: SecurityContext) => {
    const validation = await securityService.validateRequest(context);
    
    if (!validation.allowed) {
      throw new Error(validation.reason || 'Security validation failed');
    }
    
    securityService.logSecurityEvent({
      event: 'auth',
      severity: 'low',
      sessionId: context.sessionId,
      ipAddress: context.ipAddress,
      details: { userAgent: context.userAgent }
    });
  };
}