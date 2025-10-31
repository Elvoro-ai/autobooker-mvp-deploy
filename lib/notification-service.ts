"use server";

// Types pour le service de notifications
export interface NotificationChannel {
  type: 'email' | 'sms' | 'whatsapp' | 'push';
  address: string; // email, phone number, etc.
  verified: boolean;
  preferences: {
    booking_confirmation: boolean;
    booking_reminder: boolean;
    booking_cancellation: boolean;
    marketing: boolean;
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: 'email' | 'sms' | 'whatsapp';
  language: 'fr' | 'en';
  subject?: string; // Pour les emails
  content: string;
  variables: string[]; // Variables disponibles dans le template
}

export interface BookingDetails {
  id: string;
  date: string;
  time: string;
  duration: number;
  service: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  practitionerName: string;
  location?: string;
  notes?: string;
  rescheduleLink?: string;
  cancelLink?: string;
}

export interface NotificationRequest {
  type: 'booking_confirmation' | 'booking_reminder' | 'booking_cancellation' | 'booking_update';
  channel: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  bookingDetails: BookingDetails;
  language?: 'fr' | 'en';
  scheduledFor?: Date; // Pour les rappels programmés
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryStatus?: 'sent' | 'delivered' | 'failed' | 'pending';
}

// Templates par défault
const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'booking_confirmation_email_fr',
    name: 'Confirmation de rendez-vous (Email FR)',
    channel: 'email',
    language: 'fr',
    subject: '✅ Votre rendez-vous du {{date}} à {{time}} est confirmé',
    content: `Bonjour {{clientName}},

Votre rendez-vous est confirmé !

📅 **Détails de votre rendez-vous :**
- Date : {{date}}
- Heure : {{time}}
- Durée : {{duration}} minutes
- Service : {{service}}
- Avec : {{practitionerName}}
{{#location}}- Lieu : {{location}}{{/location}}

🔔 **Rappels :**
- Vous recevrez un rappel 24h avant
- Vous recevrez un rappel 2h avant

🔄 **Besoin de modifier ou annuler ?**
{{#rescheduleLink}}[Reprogrammer votre rendez-vous]({{rescheduleLink}}){{/rescheduleLink}}
{{#cancelLink}}[Annuler votre rendez-vous]({{cancelLink}}){{/cancelLink}}

{{#notes}}📝 **Notes :** {{notes}}{{/notes}}

Merci de votre confiance !

---
AutoBooker AI - Assistant de réservation automatique
Cet email a été envoyé automatiquement.`,
    variables: ['clientName', 'date', 'time', 'duration', 'service', 'practitionerName', 'location', 'notes', 'rescheduleLink', 'cancelLink']
  },
  {
    id: 'booking_reminder_sms_fr',
    name: 'Rappel de rendez-vous (SMS FR)',
    channel: 'sms',
    language: 'fr',
    content: `🔔 Rappel: RDV demain {{date}} à {{time}} ({{service}}) avec {{practitionerName}}. {{#cancelLink}}Annuler: {{cancelLink}}{{/cancelLink}}`,
    variables: ['date', 'time', 'service', 'practitionerName', 'cancelLink']
  },
  {
    id: 'booking_reminder_whatsapp_fr',
    name: 'Rappel de rendez-vous (WhatsApp FR)',
    channel: 'whatsapp',
    language: 'fr',
    content: `🔔 **Rappel de rendez-vous**

Bonjour {{clientName}} !

Votre rendez-vous est prévu :
📅 {{date}} à {{time}}
🩺 {{service}} ({{duration}}min)
👨‍⚕️ Avec {{practitionerName}}
{{#location}}📍 {{location}}{{/location}}

{{#rescheduleLink}}🔄 Reprogrammer : {{rescheduleLink}}{{/rescheduleLink}}
{{#cancelLink}}❌ Annuler : {{cancelLink}}{{/cancelLink}}

À bientôt ! 🙏`,
    variables: ['clientName', 'date', 'time', 'duration', 'service', 'practitionerName', 'location', 'rescheduleLink', 'cancelLink']
  },
  {
    id: 'booking_cancellation_email_fr',
    name: 'Annulation de rendez-vous (Email FR)',
    channel: 'email',
    language: 'fr',
    subject: '❌ Annulation de votre rendez-vous du {{date}}',
    content: `Bonjour {{clientName}},

Votre rendez-vous du **{{date}} à {{time}}** pour {{service}} a été annulé.

🔄 **Souhaitez-vous reprendre un nouveau rendez-vous ?**
{{#rescheduleLink}}[Prendre un nouveau rendez-vous]({{rescheduleLink}}){{/rescheduleLink}}

Nous restons à votre disposition pour tout renseignement.

Cordialement,
{{practitionerName}}

---
AutoBooker AI - Assistant de réservation automatique`,
    variables: ['clientName', 'date', 'time', 'service', 'practitionerName', 'rescheduleLink']
  }
];

export class NotificationService {
  private templates: Map<string, NotificationTemplate> = new Map();
  private resendApiKey?: string;
  private twilioAccountSid?: string;
  private twilioAuthToken?: string;
  private whatsappFrom?: string; // Numéro WhatsApp Business

  constructor() {
    // Charger les templates par défaut
    DEFAULT_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  // Configuration des services externes
  configureResend(apiKey: string) {
    this.resendApiKey = apiKey;
  }

  configureTwilio(accountSid: string, authToken: string, whatsappFrom?: string) {
    this.twilioAccountSid = accountSid;
    this.twilioAuthToken = authToken;
    this.whatsappFrom = whatsappFrom;
  }

  // Envoi de notifications
  async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
    try {
      const template = this.getTemplate(request.type, request.channel, request.language || 'fr');
      if (!template) {
        return {
          success: false,
          error: `Template non trouvé pour ${request.type} / ${request.channel} / ${request.language || 'fr'}`
        };
      }

      const content = this.renderTemplate(template, request.bookingDetails);

      switch (request.channel) {
        case 'email':
          return await this.sendEmail({
            to: request.recipient,
            subject: template.subject ? this.renderString(template.subject, request.bookingDetails) : 'Notification AutoBooker',
            content
          });

        case 'sms':
          return await this.sendSMS(request.recipient, content);

        case 'whatsapp':
          return await this.sendWhatsApp(request.recipient, content);

        default:
          return {
            success: false,
            error: `Canal de notification non supporté: ${request.channel}`
          };
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // Planification de rappels
  async scheduleReminder(bookingDetails: BookingDetails, channels: string[]): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const bookingDate = new Date(`${bookingDetails.date}T${bookingDetails.time}:00`);

    // Rappel 24h avant
    const reminder24h = new Date(bookingDate.getTime() - 24 * 60 * 60 * 1000);
    // Rappel 2h avant
    const reminder2h = new Date(bookingDate.getTime() - 2 * 60 * 60 * 1000);

    for (const channel of channels) {
      if (channel === 'email' && bookingDetails.clientEmail) {
        // Programmer le rappel 24h (ici on simule, en production utiliser un job scheduler)
        console.log(`Rappel email programé pour ${reminder24h.toISOString()}`);
        results.push({ success: true, messageId: `scheduled_email_${Date.now()}` });
      }

      if (channel === 'sms' && bookingDetails.clientPhone) {
        console.log(`Rappel SMS programé pour ${reminder2h.toISOString()}`);
        results.push({ success: true, messageId: `scheduled_sms_${Date.now()}` });
      }
    }

    return results;
  }

  // Méthodes d'envoi spécifiques
  private async sendEmail(params: { to: string; subject: string; content: string }): Promise<NotificationResult> {
    if (!this.resendApiKey) {
      // Mode simulation si pas de clé API
      console.log('Email envoyé (simulation):', params);
      return {
        success: true,
        messageId: `mock_email_${Date.now()}`,
        deliveryStatus: 'sent'
      };
    }

    try {
      // TODO: Intégrer la vraie API Resend
      // const response = await fetch('https://api.resend.com/emails', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.resendApiKey}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     from: 'AutoBooker AI <noreply@autobooker.ai>',
      //     to: [params.to],
      //     subject: params.subject,
      //     html: this.textToHtml(params.content)
      //   })
      // });
      
      console.log('Email envoyé via Resend (mock):', params);
      return {
        success: true,
        messageId: `resend_${Date.now()}`,
        deliveryStatus: 'sent'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur envoi email'
      };
    }
  }

  private async sendSMS(to: string, content: string): Promise<NotificationResult> {
    if (!this.twilioAccountSid || !this.twilioAuthToken) {
      console.log('SMS envoyé (simulation):', { to, content });
      return {
        success: true,
        messageId: `mock_sms_${Date.now()}`,
        deliveryStatus: 'sent'
      };
    }

    try {
      // TODO: Intégrer la vraie API Twilio
      console.log('SMS envoyé via Twilio (mock):', { to, content });
      return {
        success: true,
        messageId: `twilio_sms_${Date.now()}`,
        deliveryStatus: 'sent'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur envoi SMS'
      };
    }
  }

  private async sendWhatsApp(to: string, content: string): Promise<NotificationResult> {
    if (!this.twilioAccountSid || !this.twilioAuthToken || !this.whatsappFrom) {
      console.log('WhatsApp envoyé (simulation):', { to, content });
      return {
        success: true,
        messageId: `mock_whatsapp_${Date.now()}`,
        deliveryStatus: 'sent'
      };
    }

    try {
      // TODO: Intégrer la vraie API Twilio WhatsApp
      console.log('WhatsApp envoyé via Twilio (mock):', { to, content });
      return {
        success: true,
        messageId: `twilio_whatsapp_${Date.now()}`,
        deliveryStatus: 'sent'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur envoi WhatsApp'
      };
    }
  }

  // Utilitaires de templates
  private getTemplate(type: string, channel: string, language: string): NotificationTemplate | null {
    const templateId = `${type}_${channel}_${language}`;
    return this.templates.get(templateId) || null;
  }

  private renderTemplate(template: NotificationTemplate, data: BookingDetails): string {
    return this.renderString(template.content, data);
  }

  private renderString(template: string, data: any): string {
    let result = template;
    
    // Remplacer les variables simples {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || '';
    });
    
    // Gérer les conditions {{#variable}}...{{/variable}}
    result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
      return data[key] ? content : '';
    });
    
    return result;
  }

  private textToHtml(text: string): string {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  }

  // Gestion des templates
  addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  // Méthodes de test
  async testEmailDelivery(to: string): Promise<NotificationResult> {
    return await this.sendEmail({
      to,
      subject: 'Test AutoBooker AI',
      content: 'Ceci est un test de notification par email depuis AutoBooker AI.'
    });
  }

  async testSMSDelivery(to: string): Promise<NotificationResult> {
    return await this.sendSMS(to, 'Test AutoBooker AI: Votre service de notification fonctionne correctement!');
  }
}