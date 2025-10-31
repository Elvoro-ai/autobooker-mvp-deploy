import { NextRequest, NextResponse } from 'next/server';
import { AIOrchestrator } from '@/lib/ai-orchestrator';
import { CalendarService } from '@/lib/calendar-service';
import { NotificationService } from '@/lib/notification-service';

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

// Cache en mémoire pour les sessions (en production, utiliser Redis/Upstash)
const sessions = new Map<string, any>();

// Services globaux
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

// Configuration des services avec les variables d'environnement
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
  try {
    const body: ChatRequest = await request.json();
    
    if (!body.message) {
      return NextResponse.json(
        { error: 'Message requis' },
        { status: 400 }
      );
    }

    // Générer ou récupérer l'ID de session
    const sessionId = body.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Récupérer le contexte existant ou créer un nouveau
    const existingContext = sessions.get(sessionId) || body.context;

    // Initialiser l'orchestrateur IA
    const orchestrator = new AIOrchestrator(sessionId, existingContext);
    
    // Traiter le message
    const result = await orchestrator.processMessage(body.message);
    
    // Sauvegarder le contexte
    sessions.set(sessionId, result.context);
    
    // Exécuter les actions déterminées par l'IA
    const actionResults = await executeActions(result.actions);
    
    // Préparer la réponse
    const response: ChatResponse = {
      response: result.response,
      sessionId,
      context: result.context,
      actions: actionResults
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Erreur API IA:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// Exécution des actions déterminées par l'IA
async function executeActions(actions: Array<{ type: string; data: any }>): Promise<Array<{ type: string; status: string; data?: any }>> {
  const results = [];
  
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'create_booking':
          const bookingResult = await handleCreateBooking(action.data);
          results.push({
            type: 'create_booking',
            status: bookingResult.success ? 'success' : 'failed',
            data: bookingResult
          });
          break;
          
        case 'send_confirmation_email':
          const emailResult = await handleSendConfirmationEmail(action.data);
          results.push({
            type: 'send_confirmation_email',
            status: emailResult.success ? 'success' : 'failed',
            data: emailResult
          });
          break;
          
        case 'get_available_slots':
          const slotsResult = await handleGetAvailableSlots(action.data);
          results.push({
            type: 'get_available_slots',
            status: 'success',
            data: slotsResult
          });
          break;
          
        default:
          results.push({
            type: action.type,
            status: 'not_implemented',
            data: { message: `Action ${action.type} non implémentée` }
          });
      }
    } catch (error) {
      console.error(`Erreur lors de l'exécution de l'action ${action.type}:`, error);
      results.push({
        type: action.type,
        status: 'error',
        data: { error: error instanceof Error ? error.message : 'Erreur inconnue' }
      });
    }
  }
  
  return results;
}

// Gestionnaires d'actions spécifiques
async function handleCreateBooking(data: any) {
  try {
    // Validation des données
    if (!data.date || !data.time) {
      return {
        success: false,
        error: 'Date et heure requises pour la réservation'
      };
    }

    // Créer la réservation dans le calendrier
    const bookingResult = await calendarService.createBooking({
      date: data.date,
      time: data.time,
      duration: data.duration || 60,
      title: `${data.service || 'Consultation'} - ${data.clientEmail || 'Client'}`,
      description: data.notes,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      serviceType: data.service || 'consultation'
    });

    if (bookingResult.success) {
      // Programmer les rappels automatiques
      if (data.clientEmail || data.clientPhone) {
        const reminderChannels = [];
        if (data.clientEmail) reminderChannels.push('email');
        if (data.clientPhone) reminderChannels.push('sms');
        
        await notificationService.scheduleReminder({
          id: bookingResult.eventId!,
          date: data.date,
          time: data.time,
          duration: data.duration || 60,
          service: data.service || 'consultation',
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          clientPhone: data.clientPhone,
          practitionerName: 'Dr. Dupont' // TODO: rendre configurable
        }, reminderChannels);
      }
    }

    return bookingResult;
    
  } catch (error) {
    console.error('Erreur création booking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la création'
    };
  }
}

async function handleSendConfirmationEmail(data: any) {
  try {
    if (!data.email) {
      return {
        success: false,
        error: 'Adresse email requise'
      };
    }

    const result = await notificationService.sendNotification({
      type: 'booking_confirmation',
      channel: 'email',
      recipient: data.email,
      bookingDetails: {
        id: data.bookingDetails?.id || `booking_${Date.now()}`,
        date: data.bookingDetails?.date,
        time: data.bookingDetails?.time,
        duration: data.bookingDetails?.duration || 60,
        service: data.bookingDetails?.service || 'consultation',
        clientName: data.bookingDetails?.clientName || 'Client',
        clientEmail: data.email,
        practitionerName: 'Dr. Dupont' // TODO: configurable
      }
    });

    return result;
    
  } catch (error) {
    console.error('Erreur envoi email confirmation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur envoi email'
    };
  }
}

async function handleGetAvailableSlots(data: any) {
  try {
    const date = data.date || new Date().toISOString().split('T')[0];
    const duration = data.duration || 60;
    const slots = await calendarService.getAvailableSlots(date, duration);
    
    return {
      date,
      duration,
      slots: slots.filter(slot => slot.available).map(slot => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        time: slot.start.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }))
    };
    
  } catch (error) {
    console.error('Erreur récupération slots:', error);
    return {
      error: error instanceof Error ? error.message : 'Erreur récupération créneaux'
    };
  }
}

// Endpoint GET pour les informations de statut
export async function GET() {
  return NextResponse.json({
    status: 'online',
    version: '2.0.0',
    features: {
      aiOrchestrator: true,
      calendarIntegration: !!process.env.GOOGLE_CALENDAR_ID || !!process.env.OUTLOOK_CALENDAR_ID,
      emailNotifications: !!process.env.RESEND_API_KEY,
      smsNotifications: !!process.env.TWILIO_ACCOUNT_SID,
      whatsappNotifications: !!process.env.TWILIO_WHATSAPP_FROM
    },
    sessionsActive: sessions.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
}

// Nettoyage des sessions anciennes (exécuté périodiquement)
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 heures
  
  for (const [sessionId, context] of sessions.entries()) {
    if (context.lastActivity && (now - context.lastActivity) > maxAge) {
      sessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Nettoyage toutes les heures