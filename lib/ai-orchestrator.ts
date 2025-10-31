"use server";

import { generateText } from 'ai';

// Types pour l'orchestrateur IA
export interface ConversationContext {
  sessionId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
  currentIntent?: Intent;
  extractedSlots: Slots;
  conversationStage: ConversationStage;
  userPreferences?: UserPreferences;
}

export interface Intent {
  type: 'prise_rdv' | 'modifier_rdv' | 'annuler_rdv' | 'info_service' | 'heures_ouverture' | 'salutation' | 'autre';
  confidence: number;
  entities: Array<{ type: string; value: string; confidence: number }>;
}

export interface Slots {
  date?: string;
  time?: string;
  duration?: number;
  serviceType?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  location?: string;
  notes?: string;
}

export interface UserPreferences {
  preferredTimeSlots: string[];
  preferredServices: string[];
  communicationChannel: 'email' | 'sms' | 'whatsapp';
  language: 'fr' | 'en';
}

export type ConversationStage = 
  | 'greeting' 
  | 'intent_detection' 
  | 'slot_gathering' 
  | 'slot_confirmation' 
  | 'proposal_generation' 
  | 'booking_confirmation' 
  | 'completion';

// Services disponibles avec durées
export const AVAILABLE_SERVICES = {
  'consultation': { duration: 60, name: 'Consultation standard' },
  'consultation_longue': { duration: 90, name: 'Consultation approfondie' },
  'suivi': { duration: 30, name: 'Rendez-vous de suivi' },
  'urgence': { duration: 45, name: 'Consultation urgente' },
  'teleconsultation': { duration: 30, name: 'Téléconsultation' }
};

// Heures d'ouverture par défaut
export const BUSINESS_HOURS = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '17:00' },
  saturday: { open: '09:00', close: '13:00' },
  sunday: { open: null, close: null } // Fermé
};

export class AIOrchestrator {
  private context: ConversationContext;

  constructor(sessionId: string, existingContext?: Partial<ConversationContext>) {
    this.context = {
      sessionId,
      messages: existingContext?.messages || [],
      extractedSlots: existingContext?.extractedSlots || {},
      conversationStage: existingContext?.conversationStage || 'greeting',
      userPreferences: existingContext?.userPreferences
    };
  }

  async processMessage(userMessage: string): Promise<{
    response: string;
    context: ConversationContext;
    actions: Array<{ type: string; data: any }>;
  }> {
    // Ajouter le message utilisateur au contexte
    this.context.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    // Détection d'intention et extraction d'entités
    const intent = await this.detectIntent(userMessage);
    this.context.currentIntent = intent;

    // Extraction des slots depuis le message
    const newSlots = await this.extractSlots(userMessage);
    this.context.extractedSlots = { ...this.context.extractedSlots, ...newSlots };

    // Génération de la réponse basée sur l'étape de conversation
    const response = await this.generateResponse();
    
    // Actions à exécuter (réservation, envoi d'email, etc.)
    const actions = await this.determineActions();

    // Mise à jour de l'étape de conversation
    this.updateConversationStage();

    // Ajouter la réponse au contexte
    this.context.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });

    return {
      response,
      context: this.context,
      actions
    };
  }

  private async detectIntent(message: string): Promise<Intent> {
    const systemPrompt = `Tu es un expert en détection d'intention pour un assistant de réservation. 
Analyse le message suivant et détermine l'intention principale.

Intentions possibles:
- prise_rdv: l'utilisateur veut prendre un rendez-vous
- modifier_rdv: l'utilisateur veut modifier un rendez-vous existant
- annuler_rdv: l'utilisateur veut annuler un rendez-vous
- info_service: l'utilisateur demande des informations sur les services
- heures_ouverture: l'utilisateur demande les horaires
- salutation: message de politesse/salutation
- autre: aucune des intentions ci-dessus

Réponds au format JSON: {"type": "intention", "confidence": 0.95, "entities": [{"type": "date", "value": "demain", "confidence": 0.9}]}`;

    try {
      // Note: En production, utiliser une vraie API LLM
      // Pour le moment, logique simplifiée
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('rdv') || lowerMessage.includes('rendez-vous') || lowerMessage.includes('réserver') || lowerMessage.includes('prendre')) {
        return {
          type: 'prise_rdv',
          confidence: 0.9,
          entities: this.extractEntitiesFromMessage(message)
        };
      }
      
      if (lowerMessage.includes('modifier') || lowerMessage.includes('changer') || lowerMessage.includes('déplacer')) {
        return {
          type: 'modifier_rdv',
          confidence: 0.85,
          entities: this.extractEntitiesFromMessage(message)
        };
      }
      
      if (lowerMessage.includes('annuler') || lowerMessage.includes('supprimer')) {
        return {
          type: 'annuler_rdv',
          confidence: 0.9,
          entities: []
        };
      }
      
      if (lowerMessage.includes('horaire') || lowerMessage.includes('ouvert') || lowerMessage.includes('ferme')) {
        return {
          type: 'heures_ouverture',
          confidence: 0.8,
          entities: []
        };
      }
      
      if (lowerMessage.includes('bonjour') || lowerMessage.includes('salut') || lowerMessage.includes('bonsoir')) {
        return {
          type: 'salutation',
          confidence: 0.95,
          entities: []
        };
      }
      
      return {
        type: 'autre',
        confidence: 0.5,
        entities: []
      };
    } catch (error) {
      console.error('Erreur détection intention:', error);
      return {
        type: 'autre',
        confidence: 0.1,
        entities: []
      };
    }
  }

  private extractEntitiesFromMessage(message: string): Array<{ type: string; value: string; confidence: number }> {
    const entities = [];
    const lowerMessage = message.toLowerCase();
    
    // Extraction de dates simples
    if (lowerMessage.includes('demain')) {
      entities.push({ type: 'date', value: 'demain', confidence: 0.9 });
    }
    if (lowerMessage.includes('aujourd\'hui')) {
      entities.push({ type: 'date', value: 'aujourd\'hui', confidence: 0.9 });
    }
    if (lowerMessage.includes('lundi')) {
      entities.push({ type: 'date', value: 'lundi', confidence: 0.8 });
    }
    if (lowerMessage.includes('mardi')) {
      entities.push({ type: 'date', value: 'mardi', confidence: 0.8 });
    }
    if (lowerMessage.includes('mercredi')) {
      entities.push({ type: 'date', value: 'mercredi', confidence: 0.8 });
    }
    if (lowerMessage.includes('jeudi')) {
      entities.push({ type: 'date', value: 'jeudi', confidence: 0.8 });
    }
    if (lowerMessage.includes('vendredi')) {
      entities.push({ type: 'date', value: 'vendredi', confidence: 0.8 });
    }
    
    // Extraction d'heures
    const timeRegex = /(\d{1,2})[h:]?(\d{0,2})/g;
    let timeMatch;
    while ((timeMatch = timeRegex.exec(message)) !== null) {
      const hour = timeMatch[1];
      const minute = timeMatch[2] || '00';
      entities.push({ type: 'time', value: `${hour}:${minute}`, confidence: 0.85 });
    }
    
    return entities;
  }

  private async extractSlots(message: string): Promise<Partial<Slots>> {
    const slots: Partial<Slots> = {};
    
    // Extraction basée sur les entités détectées
    if (this.context.currentIntent?.entities) {
      for (const entity of this.context.currentIntent.entities) {
        switch (entity.type) {
          case 'date':
            slots.date = entity.value;
            break;
          case 'time':
            slots.time = entity.value;
            break;
        }
      }
    }
    
    // Extraction d'email
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatch = message.match(emailRegex);
    if (emailMatch && emailMatch[0]) {
      slots.clientEmail = emailMatch[0];
    }
    
    // Extraction de téléphone français
    const phoneRegex = /(?:(?:\+33|0)[1-9])(?:[0-9]{8})/g;
    const phoneMatch = message.match(phoneRegex);
    if (phoneMatch && phoneMatch[0]) {
      slots.clientPhone = phoneMatch[0];
    }
    
    return slots;
  }

  private async generateResponse(): Promise<string> {
    const intent = this.context.currentIntent;
    const slots = this.context.extractedSlots;
    const stage = this.context.conversationStage;

    switch (intent?.type) {
      case 'salutation':
        return "Bonjour ! Je suis votre assistant AutoBooker. Je peux vous aider à prendre, modifier ou annuler un rendez-vous. Comment puis-je vous aider aujourd'hui ?";
        
      case 'prise_rdv':
        return this.handleBookingIntent(slots, stage);
        
      case 'heures_ouverture':
        return "Nos horaires d'ouverture sont :\n\n" +
               "📅 Lundi à Jeudi : 9h00 - 18h00\n" +
               "📅 Vendredi : 9h00 - 17h00\n" +
               "📅 Samedi : 9h00 - 13h00\n" +
               "📅 Dimanche : Fermé\n\n" +
               "Souhaitez-vous prendre un rendez-vous ?";
               
      case 'info_service':
        return "Voici nos services disponibles :\n\n" +
               "🩺 Consultation standard (60 min)\n" +
               "🩺 Consultation approfondie (90 min)\n" +
               "🩺 Rendez-vous de suivi (30 min)\n" +
               "🩺 Consultation urgente (45 min)\n" +
               "💻 Téléconsultation (30 min)\n\n" +
               "Quel type de rendez-vous souhaitez-vous ?";
               
      default:
        return "Je ne suis pas sûr de comprendre. Pouvez-vous me dire si vous souhaitez prendre un rendez-vous, connaître nos horaires, ou avez-vous une autre question ?";
    }
  }

  private handleBookingIntent(slots: Slots, stage: ConversationStage): string {
    const missingSlots = this.getMissingRequiredSlots(slots);
    
    if (missingSlots.length > 0) {
      return this.askForMissingSlots(missingSlots);
    }
    
    // Si tous les slots sont remplis, proposer des créneaux
    return this.generateTimeSlotProposals(slots);
  }

  private getMissingRequiredSlots(slots: Slots): string[] {
    const required = ['date', 'time'];
    return required.filter(slot => !slots[slot as keyof Slots]);
  }

  private askForMissingSlots(missingSlots: string[]): string {
    if (missingSlots.includes('date')) {
      return "Pour quel jour souhaitez-vous prendre rendez-vous ? Vous pouvez me dire par exemple \"demain\", \"vendredi prochain\" ou une date précise.";
    }
    
    if (missingSlots.includes('time')) {
      return "À quelle heure préféreriez-vous ? Par exemple \"14h30\" ou \"en fin de matinée\".";
    }
    
    return "Pouvez-vous me préciser la date et l'heure souhaitées pour votre rendez-vous ?";
  }

  private generateTimeSlotProposals(slots: Slots): string {
    // Mock de créneaux disponibles - en production, interroger le vrai calendrier
    const availableSlots = [
      { time: "09:00", available: true },
      { time: "10:30", available: true },
      { time: "14:00", available: false },
      { time: "15:30", available: true },
      { time: "16:30", available: true }
    ];
    
    const available = availableSlots.filter(slot => slot.available);
    
    if (available.length === 0) {
      return "Désolé, aucun créneau n'est disponible pour cette date. Pouvez-vous choisir une autre date ?";
    }
    
    let response = `Voici les créneaux disponibles pour ${slots.date} :\n\n`;
    available.forEach((slot, index) => {
      response += `${index + 1}. ${slot.time}\n`;
    });
    
    response += "\nQuel créneau vous convient le mieux ? Répondez simplement par le numéro ou l'heure.";
    
    return response;
  }

  private async determineActions(): Promise<Array<{ type: string; data: any }>> {
    const actions = [];
    const intent = this.context.currentIntent;
    const slots = this.context.extractedSlots;
    
    // Si réservation confirmée, ajouter l'action de booking
    if (intent?.type === 'prise_rdv' && this.hasAllRequiredSlots(slots)) {
      actions.push({
        type: 'create_booking',
        data: {
          date: slots.date,
          time: slots.time,
          duration: slots.duration || 60,
          service: slots.serviceType || 'consultation',
          clientEmail: slots.clientEmail,
          clientPhone: slots.clientPhone,
          notes: slots.notes
        }
      });
      
      // Ajouter action d'envoi de confirmation
      if (slots.clientEmail) {
        actions.push({
          type: 'send_confirmation_email',
          data: {
            email: slots.clientEmail,
            bookingDetails: {
              date: slots.date,
              time: slots.time,
              service: slots.serviceType || 'consultation'
            }
          }
        });
      }
    }
    
    return actions;
  }

  private hasAllRequiredSlots(slots: Slots): boolean {
    return !!(slots.date && slots.time);
  }

  private updateConversationStage(): void {
    const intent = this.context.currentIntent;
    const slots = this.context.extractedSlots;
    
    if (intent?.type === 'salutation') {
      this.context.conversationStage = 'greeting';
    } else if (intent?.type === 'prise_rdv') {
      if (this.hasAllRequiredSlots(slots)) {
        this.context.conversationStage = 'booking_confirmation';
      } else {
        this.context.conversationStage = 'slot_gathering';
      }
    } else {
      this.context.conversationStage = 'intent_detection';
    }
  }

  getContext(): ConversationContext {
    return this.context;
  }
}