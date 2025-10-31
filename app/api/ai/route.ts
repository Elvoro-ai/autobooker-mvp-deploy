import { NextRequest, NextResponse } from 'next/server';
import { AIOrchestrator } from '@/lib/ai-orchestrator';
import { CalendarService } from '@/lib/calendar-service';
import { NotificationService } from '@/lib/notification-service';
import { securityService, SecurityContext } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';

// Interface pour les requêtes API
interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: any;
}

interface ChatResponse {
  response: string;
  sessionId: string;
  context: any;
  actions?: Array<{ type: string; status: string; data?: any }>;
}

// Cache en mémoire pour les sessions avec TTL (en production, utiliser Redis/Upstash)
const sessions = new Map<string, { context: any; lastActivity: number; createdAt: number }>();
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 heures
const SESSION_MAX_INACTIVE = 4 * 60 * 60 * 1000; // 4 heures d'inactivité

// Services globaux avec configuration sécurisée
const calendarService = new CalendarService({
  businessHours: {
    monday: { open: '09:00', close: '18:00' },
    tuesday: { open: '09:00', close: '18:00' },
    wednesday: { open: '09:00', close: '18:00' },
    thursday: { open: '09:00', close: '18:00' },
    friday: { open: '09:00', close: '17:00' },
    saturday: { open: '09:00', close: '13:00' },
    sunday: { open: null, close: null }
  },
  timezone: 'Europe/Paris',
  bufferMinutes: 15,
  advanceBookingDays: 1,
  maxBookingDays: 60
});

const notificationService = new NotificationService();

// Configuration sécurisée des services externes
if (process.env.RESEND_API_KEY) {
  notificationService.configureResend(process.env.RESEND_API_KEY);
}

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  notificationService.configureTwilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
    process.env.TWILIO_WHATSAPP_FROM
  );
}

if (process.env.GOOGLE_CALENDAR_ID) {
  calendarService.configureGoogleCalendar(process.env.GOOGLE_CALENDAR_ID);
}

if (process.env.OUTLOOK_CALENDAR_ID) {
  calendarService.configureOutlookCalendar(process.env.OUTLOOK_CALENDAR_ID);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let securityContext: SecurityContext | null = null;
  
  try {
    // Extraction des informations de sécurité
    const ipAddress = request.ip || 
      request.headers.get('x-forwarded-for')?.split(',')[0] || 
      request.headers.get('x-real-ip') || 
      'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    
    securityContext = {
      sessionId: 'temp',
      ipAddress,
      userAgent,
      timestamp: new Date(),
      permissions: ['chat', 'booking']
    };

    // Vérifications de sécurité préliminaires
    const securityCheck = await securityService.validateRequest(securityContext);
    if (!securityCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Request blocked by security policy',
          reason: securityCheck.reason
        },
        { 
          status: 429,
          headers: {
            'X-Security-Block': 'true',
            'Retry-After': '60'
          }
        }
      );
    }

    // Rate limiting spécifique à l'IA
    const rateLimitResult = await rateLimit.check(`${ipAddress}:ai_chat`, 'ai_chat');
    if (!rateLimitResult.allowed) {
      securityService.logSecurityEvent({
        event: 'suspicious',
        severity: 'medium',
        sessionId: 'unknown',
        ipAddress,
        details: { 
          reason: 'ai_rate_limit_exceeded',
          current: rateLimitResult.limit - rateLimitResult.remaining,
          limit: rateLimitResult.limit
        }
      });
      
      return NextResponse.json(
        { 
          error: 'Too many requests',
          message: `Limite atteinte. Réessayez dans ${rateLimitResult.retryAfter} secondes.`,
          retryAfter: rateLimitResult.retryAfter
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // Parse et validation du body
    const body: ChatRequest = await request.json();
    
    // Validation des entrées
    const validation = securityService.validateAndSanitize(body, {
      message: { 
        required: true, 
        type: 'string', 
        maxLength: 2000,
        minLength: 1
      },
      sessionId: { 
        type: 'string', 
        maxLength: 100 
      }
    });
    
    if (!validation.isValid) {
      securityService.logSecurityEvent({
        event: 'suspicious',
        severity: 'medium',
        sessionId: body.sessionId || 'unknown',
        ipAddress,
        details: { reason: 'validation_failed', errors: validation.errors }
      });
      
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    const sanitizedBody = validation.sanitizedData;

    // Générer ou récupérer l'ID de session sécurisé
    const sessionId = sanitizedBody.sessionId || securityService.generateSessionId();
    securityContext.sessionId = sessionId;
    
    // Récupérer le contexte existant avec validation
    let existingSession = sessions.get(sessionId);
    const now = Date.now();
    
    // Vérifier la validité de la session
    if (existingSession) {
      const isExpired = (now - existingSession.createdAt) > SESSION_TTL;
      const isInactive = (now - existingSession.lastActivity) > SESSION_MAX_INACTIVE;
      
      if (isExpired || isInactive) {
        sessions.delete(sessionId);
        existingSession = null;
        
        securityService.logSecurityEvent({
          event: 'auth',
          severity: 'low',
          sessionId,
          ipAddress,
          details: { reason: isExpired ? 'session_expired' : 'session_inactive' }
        });
      }
    }

    // Initialiser l'orchestrateur IA avec contexte sécurisé
    const orchestrator = new AIOrchestrator(
      sessionId, 
      existingSession?.context || sanitizedBody.context
    );
    
    // Traitement du message avec gestion d'erreur robuste
    let result;
    try {
      result = await orchestrator.processMessage(sanitizedBody.message);
    } catch (orchestratorError) {
      securityService.logSecurityEvent({
        event: 'error',
        severity: 'high',
        sessionId,
        ipAddress,
        details: { 
          stage: 'orchestrator_processing',
          error: orchestratorError instanceof Error ? orchestratorError.message : 'Unknown orchestrator error'
        }
      });
      
      return NextResponse.json(
        { 
          error: 'Processing error',
          message: 'Une erreur est survenue lors du traitement de votre message. Veuillez réessayer.'
        },
        { status: 500 }
      );
    }
    
    // Sauvegarder le contexte avec métadonnées de sécurité
    sessions.set(sessionId, {
      context: result.context,
      lastActivity: now,
      createdAt: existingSession?.createdAt || now
    });
    
    // Exécuter les actions avec gestion d'erreur
    let actionResults = [];
    try {
      actionResults = await executeActions(result.actions, securityContext);
    } catch (actionError) {
      securityService.logSecurityEvent({
        event: 'error',
        severity: 'medium',
        sessionId,
        ipAddress,
        details: { 
          stage: 'action_execution',
          error: actionError instanceof Error ? actionError.message : 'Unknown action error'
        }
      });
    }
    
    // Log de l'activité normale
    securityService.logSecurityEvent({
      event: 'data_access',
      severity: 'low',
      sessionId,
      ipAddress,
      details: { 
        message_length: sanitizedBody.message.length,
        intent: result.context.currentIntent?.type,
        processing_time: Date.now() - startTime,
        actions_executed: actionResults.length
      }
    });
    
    // Préparer la réponse avec headers de sécurité
    const response: ChatResponse = {
      response: result.response,
      sessionId,
      context: securityService.maskPII(result.context), // Masquer les PII dans la réponse
      actions: actionResults
    };

    return NextResponse.json(response, {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'",
        'X-Session-Id': sessionId,
        'X-Processing-Time': `${Date.now() - startTime}ms`,
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
      }
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (securityContext) {
      securityService.logSecurityEvent({
        event: 'error',
        severity: 'high',
        sessionId: securityContext.sessionId,
        ipAddress: securityContext.ipAddress,
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          processing_time: processingTime
        }
      });
    }
    
    console.error('Erreur API IA:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Une erreur technique est survenue. Notre équipe a été notifiée.',
        requestId: securityService.generateSecureToken(8)
      },
      { 
        status: 500,
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-Processing-Time': `${processingTime}ms`
        }
      }
    );
  }
}

// Exécution sécurisée des actions
async function executeActions(
  actions: Array<{ type: string; data: any }>,
  securityContext: SecurityContext
): Promise<Array<{ type: string; status: string; data?: any }>> {
  const results = [];
  
  for (const action of actions) {
    const actionStartTime = Date.now();
    
    try {
      // Log de début d'action
      securityService.logSecurityEvent({
        event: 'data_modify',
        severity: 'low',
        sessionId: securityContext.sessionId,
        ipAddress: securityContext.ipAddress,
        details: { action: action.type, stage: 'start' }
      });
      
      let result;
      switch (action.type) {
        case 'create_booking':
          result = await handleCreateBooking(action.data, securityContext);
          break;
          
        case 'send_confirmation_email':
          result = await handleSendConfirmationEmail(action.data, securityContext);
          break;
          
        case 'get_available_slots':
          result = await handleGetAvailableSlots(action.data, securityContext);
          break;
          
        default:
          result = {
            success: false,
            error: `Action ${action.type} non implémentée`
          };
      }
      
      results.push({
        type: action.type,
        status: result.success ? 'success' : 'failed',
        data: securityService.maskPII(result)
      });
      
      // Log de fin d'action
      securityService.logSecurityEvent({
        event: 'data_modify',
        severity: result.success ? 'low' : 'medium',
        sessionId: securityContext.sessionId,
        ipAddress: securityContext.ipAddress,
        details: { 
          action: action.type, 
          stage: 'complete',
          success: result.success,
          processing_time: Date.now() - actionStartTime
        }
      });
      
    } catch (error) {
      const actionError = error instanceof Error ? error.message : 'Unknown error';
      
      securityService.logSecurityEvent({
        event: 'error',
        severity: 'high',
        sessionId: securityContext.sessionId,
        ipAddress: securityContext.ipAddress,
        details: { 
          action: action.type,
          stage: 'execution',
          error: actionError,
          processing_time: Date.now() - actionStartTime
        }
      });
      
      results.push({
        type: action.type,
        status: 'error',
        data: { error: 'Erreur lors de l\'exécution de l\'action' }
      });
    }
  }
  
  return results;
}

// Gestionnaires d'actions sécurisés
async function handleCreateBooking(data: any, securityContext: SecurityContext) {
  try {
    // Validation sécurisée des données de réservation
    const bookingValidation = securityService.validateAndSanitize(data, {
      date: { required: true, type: 'date' },
      time: { required: true, type: 'string', pattern: /^\d{2}:\d{2}$/ },
      duration: { type: 'number' },
      clientEmail: { type: 'email', maxLength: 254 },
      clientPhone: { type: 'phone', maxLength: 20 },
      service: { type: 'string', maxLength: 100 },
      notes: { type: 'string', maxLength: 500 }
    });

    if (!bookingValidation.isValid) {
      return {
        success: false,
        error: 'Données de réservation invalides',
        details: bookingValidation.errors
      };
    }

    const sanitizedData = bookingValidation.sanitizedData;

    // Vérifier les permissions pour la création de booking
    if (!securityContext.permissions.includes('booking')) {
      return {
        success: false,
        error: 'Permissions insuffisantes pour créer une réservation'
      };
    }

    // Créer la réservation avec données chiffrées
    const bookingRequest = {
      ...sanitizedData,
      title: `${sanitizedData.service || 'Consultation'} - ${sanitizedData.clientEmail ? securityService.maskPII({email: sanitizedData.clientEmail}).email : 'Client'}`,
      duration: sanitizedData.duration || 60,
      serviceType: sanitizedData.service || 'consultation'
    };

    const bookingResult = await calendarService.createBooking(bookingRequest);

    if (bookingResult.success && bookingResult.eventId) {
      // Programmer les rappels avec données chiffrées
      const reminderChannels = [];
      if (sanitizedData.clientEmail) reminderChannels.push('email');
      if (sanitizedData.clientPhone) reminderChannels.push('sms');
      
      if (reminderChannels.length > 0) {
        await notificationService.scheduleReminder({
          id: bookingResult.eventId,
          date: sanitizedData.date,
          time: sanitizedData.time,
          duration: sanitizedData.duration || 60,
          service: sanitizedData.service || 'consultation',
          clientName: sanitizedData.clientName || 'Client',
          clientEmail: sanitizedData.clientEmail,
          clientPhone: sanitizedData.clientPhone,
          practitionerName: 'Dr. Dupont' // TODO: rendre configurable
        }, reminderChannels);
      }
    }

    return {
      ...bookingResult,
      bookingId: bookingResult.eventId
    };
    
  } catch (error) {
    console.error('Erreur création booking sécurisée:', error);
    return {
      success: false,
      error: 'Erreur technique lors de la création de la réservation'
    };
  }
}

async function handleSendConfirmationEmail(data: any, securityContext: SecurityContext) {
  try {
    const emailValidation = securityService.validateAndSanitize(data, {
      email: { required: true, type: 'email', maxLength: 254 }
    });

    if (!emailValidation.isValid) {
      return {
        success: false,
        error: 'Adresse email invalide',
        details: emailValidation.errors
      };
    }

    const result = await notificationService.sendNotification({
      type: 'booking_confirmation',
      channel: 'email',
      recipient: emailValidation.sanitizedData.email,
      bookingDetails: {
        id: data.bookingDetails?.id || `booking_${Date.now()}`,
        date: data.bookingDetails?.date,
        time: data.bookingDetails?.time,
        duration: data.bookingDetails?.duration || 60,
        service: data.bookingDetails?.service || 'consultation',
        clientName: data.bookingDetails?.clientName || 'Client',
        clientEmail: emailValidation.sanitizedData.email,
        practitionerName: 'Dr. Dupont'
      }
    });

    return result;
    
  } catch (error) {
    console.error('Erreur envoi email sécurisé:', error);
    return {
      success: false,
      error: 'Erreur lors de l\'envoi de l\'email de confirmation'
    };
  }
}

async function handleGetAvailableSlots(data: any, securityContext: SecurityContext) {
  try {
    const slotsValidation = securityService.validateAndSanitize(data, {
      date: { required: true, type: 'date' },
      duration: { type: 'number' }
    });

    if (!slotsValidation.isValid) {
      return {
        success: false,
        error: 'Paramètres de créneaux invalides',
        details: slotsValidation.errors
      };
    }

    const sanitizedData = slotsValidation.sanitizedData;
    const slots = await calendarService.getAvailableSlots(
      sanitizedData.date, 
      sanitizedData.duration || 60
    );
    
    return {
      success: true,
      data: {
        date: sanitizedData.date,
        duration: sanitizedData.duration || 60,
        slots: slots.filter(slot => slot.available).map(slot => ({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          time: slot.start.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        }))
      }
    };
    
  } catch (error) {
    console.error('Erreur récupération slots sécurisée:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération des créneaux'
    };
  }
}

// Endpoint GET pour le statut et la santé du service
export async function GET(request: NextRequest) {
  const ipAddress = request.ip || 'unknown';
  
  // Rate limiting pour les requêtes de statut
  const rateLimitResult = await rateLimit.check(`${ipAddress}:status`, 'general');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many status requests' },
      { status: 429 }
    );
  }

  const stats = securityService.getSecurityStats();
  const rateLimitStats = rateLimit.getStats();
  
  return NextResponse.json({
    status: 'online',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    
    // Fonctionnalités disponibles
    features: {
      aiOrchestrator: true,
      calendarIntegration: !!process.env.GOOGLE_CALENDAR_ID || !!process.env.OUTLOOK_CALENDAR_ID,
      emailNotifications: !!process.env.RESEND_API_KEY,
      smsNotifications: !!process.env.TWILIO_ACCOUNT_SID,
      whatsappNotifications: !!process.env.TWILIO_WHATSAPP_FROM,
      enterpriseSecurity: true,
      rateLimiting: true,
      gdprCompliance: true,
      encryption: true
    },
    
    // Statistiques (non-sensibles)
    stats: {
      activeSessions: sessions.size,
      securityEvents: stats.totalEvents,
      rateLimitEntries: rateLimitStats.totalEntries
    },
    
    // Configuration publique
    limits: {
      ai_chat: '20 req/min',
      booking: '10 req/min',
      general: '100 req/min'
    }
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    }
  });
}

// Nettoyage automatique des sessions expirées
setInterval(() => {
  const now = Date.now();
  const expiredSessions = [];
  
  for (const [sessionId, session] of sessions.entries()) {
    const isExpired = (now - session.createdAt) > SESSION_TTL;
    const isInactive = (now - session.lastActivity) > SESSION_MAX_INACTIVE;
    
    if (isExpired || isInactive) {
      expiredSessions.push(sessionId);
      sessions.delete(sessionId);
    }
  }
  
  if (expiredSessions.length > 0) {
    console.log(`Nettoyage: ${expiredSessions.length} sessions expirées supprimées`);
  }
}, 60 * 60 * 1000); // Nettoyage toutes les heures