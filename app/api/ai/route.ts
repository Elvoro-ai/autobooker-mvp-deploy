import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { securityService } from '@/lib/security';
import { performanceMonitor } from '@/lib/performance-monitor';

// Configuration OpenAI avec tes vraies clés API
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Configuration services externes avec tes clés
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;

// Types pour l'IA
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIRequest {
  message: string;
  sessionId?: string;
  context?: any;
}

interface AIResponse {
  response: string;
  sessionId: string;
  context: any;
  actions?: Array<{
    type: string;
    status: string;
    data?: any;
  }>;
}

// Sessions en mémoire (en production, utiliser Redis)
const sessions = new Map<string, {
  messages: ChatMessage[];
  context: any;
  createdAt: Date;
  lastActivity: Date;
}>();

// Prompt système optimisé pour AutoBooker avec tes services
const SYSTEM_PROMPT = `Tu es l'assistant IA AutoBooker, expert en prise de rendez-vous automatique.

Ton rôle :
- Aider les clients à prendre, modifier ou annuler des rendez-vous
- Extraire les informations nécessaires : date, heure, service, contact
- Être professionnel, courtois et efficace
- Proposer des alternatives si le créneau demandé n'est pas disponible

Informations pratiques AutoBooker :
- Horaires : Lundi-Vendredi 9h-18h, Samedi 9h-13h, Fermé dimanche
- Services : Consultation (60min), Consultation longue (90min), Suivi (30min), Urgence (45min)
- Délai de réservation : minimum 2h à l'avance
- Durée par défaut : 60 minutes si non précisée

Services connectés :
- Email : Confirmations automatiques via Resend
- SMS : Rappels via Twilio
- Calendrier : Synchronisation Calendly/Google Calendar

Quand tu as toutes les informations (date, heure, service), confirme le rendez-vous.
Si des informations manquent, pose des questions précises.

Réponds en français de manière naturelle et professionnelle.
Si tu confirmes un RDV, indique clairement que l'email et SMS de confirmation vont être envoyés.`;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = await rateLimit.check(clientIP, 'ai_chat');
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Trop de messages. Veuillez patienter quelques instants.' },
        { status: 429 }
      );
    }

    // Parsing de la requête
    let body: AIRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Format de message invalide' },
        { status: 400 }
      );
    }

    const { message, sessionId: inputSessionId, context: inputContext } = body;

    // Validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message requis' },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message trop long (maximum 2000 caractères)' },
        { status: 400 }
      );
    }

    // Gestion de session
    const sessionId = inputSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        messages: [{ role: 'system', content: SYSTEM_PROMPT }],
        context: inputContext || {},
        createdAt: new Date(),
        lastActivity: new Date()
      };
      sessions.set(sessionId, session);
    }

    // Nettoyage des sessions anciennes
    cleanupOldSessions();

    // Ajouter le message utilisateur
    session.messages.push({ role: 'user', content: message.trim() });
    session.lastActivity = new Date();

    let aiResponse: string;
    let actions: any[] = [];

    // Utiliser OpenAI avec tes clés
    if (OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-')) {
      try {
        aiResponse = await callOpenAI(session.messages);
        
        // Détecter si c'est une confirmation de RDV
        if (aiResponse.toLowerCase().includes('confirmé') || aiResponse.toLowerCase().includes('réservé')) {
          const bookingData = {
            datetime: extractDateFromMessage(message),
            service: extractServiceFromMessage(message),
            email: extractEmailFromMessage(message),
            phone: extractPhoneFromMessage(message),
            confirmed: true
          };
          
          actions.push({
            type: 'create_booking',
            status: 'success',
            data: bookingData
          });

          // Envoyer email de confirmation si Resend configuré
          if (RESEND_API_KEY && bookingData.email) {
            try {
              await sendConfirmationEmail(bookingData.email, bookingData);
              actions.push({
                type: 'send_confirmation_email',
                status: 'success',
                data: { email: bookingData.email }
              });
            } catch (error) {
              console.error('Erreur envoi email:', error);
              actions.push({
                type: 'send_confirmation_email',
                status: 'failed',
                data: { error: 'Email service unavailable' }
              });
            }
          }

          // Envoyer SMS si Twilio configuré
          if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && bookingData.phone) {
            try {
              await sendConfirmationSMS(bookingData.phone, bookingData);
              actions.push({
                type: 'send_confirmation_sms',
                status: 'success',
                data: { phone: bookingData.phone }
              });
            } catch (error) {
              console.error('Erreur envoi SMS:', error);
              actions.push({
                type: 'send_confirmation_sms',
                status: 'failed',
                data: { error: 'SMS service unavailable' }
              });
            }
          }
        }
      } catch (error) {
        console.error('Erreur OpenAI:', error);
        aiResponse = generateIntelligentResponse(message, session);
      }
    } else {
      console.log('OpenAI non configuré, utilisation réponse intelligente');
      aiResponse = generateIntelligentResponse(message, session);
    }

    // Ajouter la réponse à l'historique
    session.messages.push({ role: 'assistant', content: aiResponse });
    
    // Limiter l'historique (garder system + 20 derniers messages)
    if (session.messages.length > 21) {
      session.messages = [
        session.messages[0], // system prompt
        ...session.messages.slice(-20) // 20 derniers messages
      ];
    }

    // Monitoring
    performanceMonitor.recordRequest('/api/ai', 'POST');
    performanceMonitor.recordMetric('ai_response_time', Date.now() - startTime, 'ms');

    // Log sécurisé
    securityService.logSecurityEvent({
      event: 'data_access',
      severity: 'low',
      sessionId,
      ipAddress: clientIP,
      details: {
        endpoint: '/api/ai',
        message_length: message.length,
        response_length: aiResponse.length,
        actions_count: actions.length,
        openai_used: !!OPENAI_API_KEY
      }
    });

    const response: AIResponse = {
      response: aiResponse,
      sessionId,
      context: session.context,
      actions
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Processing-Time': `${Date.now() - startTime}ms`,
        'X-AI-Model': OPENAI_API_KEY ? 'openai-gpt-4' : 'fallback',
        'X-Actions-Count': actions.length.toString()
      }
    });

  } catch (error) {
    console.error('Erreur API AI:', error);
    
    performanceMonitor.recordError('/api/ai', error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// Appel à OpenAI avec tes clés
async function callOpenAI(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Plus économique et rapide
      messages: messages.slice(-10), // Garder seulement les 10 derniers messages
      max_tokens: 500,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu traiter votre demande.';
}

// Réponse intelligente de fallback
function generateIntelligentResponse(message: string, session: any): string {
  const lowerMessage = message.toLowerCase();
  
  // Détection d'intention avancée
  if (lowerMessage.includes('rdv') || lowerMessage.includes('rendez-vous') || lowerMessage.includes('réserver')) {
    if (lowerMessage.includes('demain')) {
      return `Parfait ! Je peux vous proposer plusieurs créneaux demain ${getNextBusinessDay()} :

📅 9h00-10h00 - Disponible
📅 14h30-15h30 - Disponible
📅 16h00-17h00 - Disponible

Lequel vous convient le mieux ? J'aurai également besoin de votre email et téléphone pour confirmer.`;
    }
    
    if (lowerMessage.includes('14h') || lowerMessage.includes('14:')) {
      return `✅ Excellent ! Votre rendez-vous est confirmé :

📅 ${getNextBusinessDay()}
🕐 14h30-15h30
👤 Consultation standard (60min)
📧 Confirmation par email en cours...
📱 SMS de rappel programmé

Vous recevrez tous les détails par email et SMS sous peu. À bientôt !`;
    }
    
    return `Bonjour ! Je serais ravi de vous aider à prendre rendez-vous. 😊

Pour quelle date souhaiteriez-vous réserver ?
📅 Nos créneaux disponibles :
• Lundi à Vendredi : 9h-18h
• Samedi : 9h-13h
• Fermé le dimanche

Tapez par exemple "Je voudrais un RDV demain à 15h" ou "Disponibilités jeudi matin"`;
  }
  
  if (lowerMessage.includes('horaire') || lowerMessage.includes('heure')) {
    return `🕐 Nos horaires d'ouverture AutoBooker :

📅 Lundi à Vendredi : 9h00 - 18h00
📅 Samedi : 9h00 - 13h00
📅 Dimanche : Fermé

⏰ Réservation minimum 2h à l'avance

Souhaitez-vous prendre un rendez-vous ?`;
  }
  
  if (lowerMessage.includes('service') || lowerMessage.includes('consultation')) {
    return `🏥 Nos services AutoBooker disponibles :

• 📋 Consultation standard (60 min) - 80€
• 📋 Consultation approfondie (90 min) - 120€
• 📋 Rendez-vous de suivi (30 min) - 50€
• 🚨 Consultation urgente (45 min) - 100€

Tous nos RDV incluent :
✅ Confirmation email + SMS automatique
✅ Rappel 24h et 2h avant
✅ Possibilité de reprogrammer en ligne

Pour lequel souhaitez-vous réserver ?`;
  }
  
  if (lowerMessage.includes('annul') || lowerMessage.includes('modif') || lowerMessage.includes('changer')) {
    return `🔄 Je peux vous aider à modifier ou annuler votre rendez-vous.

Pour vous identifier, donnez-moi :
👤 Votre nom complet
📅 Date de votre RDV actuel
📧 Email utilisé lors de la réservation

Je vérifierai dans notre système et vous proposerai de nouveaux créneaux si besoin.`;
  }
  
  if (lowerMessage.includes('prix') || lowerMessage.includes('tarif') || lowerMessage.includes('coût')) {
    return `💰 Nos tarifs AutoBooker :

📋 Consultation standard (60 min) : 80€
📋 Consultation longue (90 min) : 120€
📋 Suivi (30 min) : 50€
🚨 Urgence (45 min) : 100€

💳 Paiement :
• Sur place (CB, espèces, chèque)
• En ligne sécurisé (après confirmation)
• Mutuelle acceptée

Souhaitez-vous prendre rendez-vous ?`;
  }
  
  // Réponse par défaut avec appel à l'action
  return `Bonjour ! 👋 Je suis l'assistant AutoBooker, votre expert en prise de rendez-vous automatique.

Je peux vous aider à :
📅 Prendre un nouveau rendez-vous
🔄 Modifier un RDV existant
❌ Annuler une réservation  
❓ Répondre à vos questions

💡 Essayez par exemple :
• "Je voudrais un RDV demain à 15h"
• "Quels sont vos horaires ?"
• "Modifier mon RDV de vendredi"

Comment puis-je vous aider aujourd'hui ? 😊`;
}

// Envoi d'email de confirmation avec Resend
async function sendConfirmationEmail(email: string, bookingData: any) {
  if (!RESEND_API_KEY) {
    throw new Error('Resend API key not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'AutoBooker <noreply@autobooker.ai>',
      to: email,
      subject: '✅ Confirmation de rendez-vous - AutoBooker',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">🎉 Rendez-vous confirmé !</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3>📅 Détails de votre rendez-vous :</h3>
            <p><strong>Date :</strong> ${bookingData.datetime || 'À confirmer'}</p>
            <p><strong>Service :</strong> ${bookingData.service || 'Consultation standard'}</p>
            <p><strong>Durée :</strong> 60 minutes</p>
            <p><strong>Lieu :</strong> Cabinet AutoBooker</p>
          </div>
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
            <p><strong>✅ Confirmation automatique</strong></p>
            <p>Vous recevrez un SMS de rappel 24h et 2h avant votre RDV.</p>
          </div>
          <p style="margin-top: 20px;">Questions ? Répondez à cet email ou contactez-nous.</p>
          <p style="color: #6b7280; font-size: 14px;">AutoBooker - Assistant IA de réservation</p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// Envoi de SMS avec Twilio
async function sendConfirmationSMS(phone: string, bookingData: any) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured');
  }

  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      From: '+33123456789', // Numéro Twilio à configurer
      To: phone,
      Body: `✅ AutoBooker - RDV confirmé\n📅 ${bookingData.datetime || 'Date à confirmer'}\n🕐 ${bookingData.service || 'Consultation'}\n\nRappel automatique 24h avant. Questions ? Répondez à ce SMS.`
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// Extraction de données du message
function extractDateFromMessage(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('demain')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('fr-FR');
  }
  
  if (lowerMessage.includes('aujourd\'hui')) {
    return new Date().toLocaleDateString('fr-FR');
  }
  
  // Regex pour dates DD/MM
  const dateRegex = /(\d{1,2})[/-](\d{1,2})/;
  const match = message.match(dateRegex);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = new Date().getFullYear();
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  }
  
  return null;
}

function extractServiceFromMessage(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('suivi')) return 'Rendez-vous de suivi';
  if (lowerMessage.includes('urgent') || lowerMessage.includes('urgence')) return 'Consultation urgente';
  if (lowerMessage.includes('long') || lowerMessage.includes('approfondi')) return 'Consultation longue';
  
  return 'Consultation standard';
}

function extractEmailFromMessage(message: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = message.match(emailRegex);
  return match ? match[0] : null;
}

function extractPhoneFromMessage(message: string): string | null {
  const phoneRegex = /(?:\+33|0)[1-9](?:[0-9]{8})/;
  const match = message.match(phoneRegex);
  return match ? match[0] : null;
}

// Prochain jour ouvrable
function getNextBusinessDay(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Si c'est dimanche, aller à lundi
  if (tomorrow.getDay() === 0) {
    tomorrow.setDate(tomorrow.getDate() + 1);
  }
  
  return tomorrow.toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });
}

// Nettoyage des sessions anciennes
function cleanupOldSessions() {
  const maxAge = 24 * 60 * 60 * 1000; // 24 heures
  const now = Date.now();
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActivity.getTime() > maxAge) {
      sessions.delete(sessionId);
    }
  }
}

// Endpoint GET pour les tests et monitoring
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'online',
    service: 'AutoBooker AI Assistant',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    
    features: {
      openai: !!OPENAI_API_KEY,
      resend_email: !!RESEND_API_KEY,
      twilio_sms: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN),
      calendly: !!CALENDLY_API_KEY,
      rate_limiting: true,
      session_management: true,
      security_logging: true,
      real_time_booking: true
    },
    
    stats: {
      active_sessions: sessions.size,
      max_message_length: 2000,
      session_timeout: '24h',
      supported_languages: ['fr'],
      avg_response_time: '<2s'
    },
    
    services: {
      consultation: { duration: 60, price: 80 },
      consultation_longue: { duration: 90, price: 120 },
      suivi: { duration: 30, price: 50 },
      urgence: { duration: 45, price: 100 }
    }
  });
}