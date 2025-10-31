"use server";

// Types pour le service calendrier
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  attendees?: string[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  source: 'google' | 'outlook' | 'internal';
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  conflictsWith?: string[]; // IDs des événements en conflit
}

export interface CalendarConfig {
  businessHours: {
    [key: string]: { open: string | null; close: string | null };
  };
  timezone: string;
  bufferMinutes: number; // Temps entre les rendez-vous
  advanceBookingDays: number; // Combien de jours à l'avance
  maxBookingDays: number; // Limite de réservation future
}

export interface BookingRequest {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // en minutes
  title: string;
  description?: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceType: string;
}

const DEFAULT_CONFIG: CalendarConfig = {
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
};

export class CalendarService {
  private config: CalendarConfig;
  private googleCalendarId?: string;
  private outlookCalendarId?: string;

  constructor(config: Partial<CalendarConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Configuration des calendriers externes
  configureGoogleCalendar(calendarId: string) {
    this.googleCalendarId = calendarId;
  }

  configureOutlookCalendar(calendarId: string) {
    this.outlookCalendarId = calendarId;
  }

  // Récupération des événements existants
  async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    try {
      // Google Calendar
      if (this.googleCalendarId) {
        const googleEvents = await this.fetchGoogleEvents(startDate, endDate);
        events.push(...googleEvents);
      }

      // Outlook Calendar
      if (this.outlookCalendarId) {
        const outlookEvents = await this.fetchOutlookEvents(startDate, endDate);
        events.push(...outlookEvents);
      }

      // Pour le moment, retourner des événements mock si aucun calendrier configuré
      if (!this.googleCalendarId && !this.outlookCalendarId) {
        return this.getMockEvents(startDate, endDate);
      }

      return events.sort((a, b) => a.start.getTime() - b.start.getTime());
    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      return [];
    }
  }

  // Calcul des créneaux disponibles
  async getAvailableSlots(
    date: string, // YYYY-MM-DD
    duration: number = 60, // en minutes
    slotInterval: number = 30 // intervalle entre les créneaux proposés
  ): Promise<TimeSlot[]> {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const businessHours = this.config.businessHours[dayOfWeek];

    if (!businessHours.open || !businessHours.close) {
      return []; // Jour fermé
    }

    // Créer les limites de la journée
    const dayStart = new Date(targetDate);
    const [openHour, openMinute] = businessHours.open.split(':');
    dayStart.setHours(parseInt(openHour), parseInt(openMinute), 0, 0);

    const dayEnd = new Date(targetDate);
    const [closeHour, closeMinute] = businessHours.close.split(':');
    dayEnd.setHours(parseInt(closeHour), parseInt(closeMinute), 0, 0);

    // Récupérer les événements existants
    const existingEvents = await this.getEvents(dayStart, dayEnd);

    // Générer tous les créneaux possibles
    const allSlots: TimeSlot[] = [];
    let currentTime = new Date(dayStart);

    while (currentTime.getTime() + duration * 60000 <= dayEnd.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);
      const conflicts = this.findConflicts(currentTime, slotEnd, existingEvents);
      
      allSlots.push({
        start: new Date(currentTime),
        end: slotEnd,
        available: conflicts.length === 0,
        conflictsWith: conflicts
      });

      currentTime = new Date(currentTime.getTime() + slotInterval * 60000);
    }

    return allSlots;
  }

  // Création d'un nouvel événement
  async createBooking(request: BookingRequest): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      // Validation des données
      const validation = this.validateBookingRequest(request);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Créer l'objet événement
      const startDateTime = new Date(`${request.date}T${request.time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + request.duration * 60000);

      const event: Omit<CalendarEvent, 'id' | 'source'> = {
        title: request.title,
        start: startDateTime,
        end: endDateTime,
        description: this.buildEventDescription(request),
        attendees: request.clientEmail ? [request.clientEmail] : [],
        status: 'confirmed'
      };

      // Créer dans Google Calendar si configuré
      if (this.googleCalendarId) {
        const googleEventId = await this.createGoogleEvent(event);
        if (googleEventId) {
          return { success: true, eventId: googleEventId };
        }
      }

      // Créer dans Outlook si configuré
      if (this.outlookCalendarId) {
        const outlookEventId = await this.createOutlookEvent(event);
        if (outlookEventId) {
          return { success: true, eventId: outlookEventId };
        }
      }

      // Si aucun calendrier externe, simuler la création
      const mockEventId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('Booking créé (mock):', { ...event, id: mockEventId });
      
      return { success: true, eventId: mockEventId };
    } catch (error) {
      console.error('Erreur lors de la création du booking:', error);
      return { success: false, error: 'Erreur technique lors de la réservation' };
    }
  }

  // Méthodes Google Calendar (mocked pour le moment)
  private async fetchGoogleEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    // TODO: Implémenter l'intégration Google Calendar
    // Utiliser google-auth-library et googleapis
    console.log('Fetching Google Calendar events (mock)');
    return [];
  }

  private async createGoogleEvent(event: Omit<CalendarEvent, 'id' | 'source'>): Promise<string | null> {
    // TODO: Implémenter la création d'événement Google
    console.log('Creating Google Calendar event (mock):', event);
    return `google_${Date.now()}`;
  }

  // Méthodes Outlook Calendar (mocked pour le moment)
  private async fetchOutlookEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    // TODO: Implémenter l'intégration Microsoft Graph
    console.log('Fetching Outlook Calendar events (mock)');
    return [];
  }

  private async createOutlookEvent(event: Omit<CalendarEvent, 'id' | 'source'>): Promise<string | null> {
    // TODO: Implémenter la création d'événement Outlook
    console.log('Creating Outlook Calendar event (mock):', event);
    return `outlook_${Date.now()}`;
  }

  // Événements mock pour la démo
  private getMockEvents(startDate: Date, endDate: Date): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Ajouter quelques événements mock par jour
      if (Math.random() > 0.3) { // 70% de chance d'avoir des événements
        const numEvents = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numEvents; i++) {
          const hour = 9 + Math.floor(Math.random() * 8); // Entre 9h et 17h
          const duration = [30, 60, 90][Math.floor(Math.random() * 3)];
          
          const eventStart = new Date(currentDate);
          eventStart.setHours(hour, 0, 0, 0);
          
          const eventEnd = new Date(eventStart.getTime() + duration * 60000);
          
          events.push({
            id: `mock_${currentDate.getTime()}_${i}`,
            title: `Rendez-vous client`,
            start: eventStart,
            end: eventEnd,
            status: 'confirmed',
            source: 'internal'
          });
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return events;
  }

  // Utilitaires
  private findConflicts(slotStart: Date, slotEnd: Date, existingEvents: CalendarEvent[]): string[] {
    return existingEvents
      .filter(event => {
        return (slotStart < event.end && slotEnd > event.start);
      })
      .map(event => event.id);
  }

  private validateBookingRequest(request: BookingRequest): { valid: boolean; error?: string } {
    // Vérifier que la date n'est pas dans le passé
    const requestDate = new Date(`${request.date}T${request.time}:00`);
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + this.config.advanceBookingDays * 24 * 60 * 60 * 1000);
    
    if (requestDate < minBookingTime) {
      return { valid: false, error: `Vous devez réserver au moins ${this.config.advanceBookingDays} jour(s) à l'avance` };
    }

    // Vérifier la limite de réservation future
    const maxBookingTime = new Date(now.getTime() + this.config.maxBookingDays * 24 * 60 * 60 * 1000);
    if (requestDate > maxBookingTime) {
      return { valid: false, error: `Vous ne pouvez pas réserver plus de ${this.config.maxBookingDays} jours à l'avance` };
    }

    // Vérifier les heures d'ouverture
    const dayOfWeek = requestDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const businessHours = this.config.businessHours[dayOfWeek];
    
    if (!businessHours.open || !businessHours.close) {
      return { valid: false, error: 'Nous sommes fermés ce jour-là' };
    }

    const [requestHour, requestMinute] = request.time.split(':').map(Number);
    const [openHour, openMinute] = businessHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = businessHours.close.split(':').map(Number);
    
    const requestMinutes = requestHour * 60 + requestMinute;
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;
    const endMinutes = requestMinutes + request.duration;
    
    if (requestMinutes < openMinutes || endMinutes > closeMinutes) {
      return { valid: false, error: `Les horaires disponibles sont de ${businessHours.open} à ${businessHours.close}` };
    }

    return { valid: true };
  }

  private buildEventDescription(request: BookingRequest): string {
    let description = `Service: ${request.serviceType}\nDurée: ${request.duration} minutes`;
    
    if (request.description) {
      description += `\n\nNotes: ${request.description}`;
    }
    
    if (request.clientPhone) {
      description += `\n\nTéléphone: ${request.clientPhone}`;
    }
    
    description += `\n\nRéservé via AutoBooker AI`;
    
    return description;
  }

  // Méthode pour obtenir la configuration
  getConfig(): CalendarConfig {
    return { ...this.config };
  }

  // Méthode pour mettre à jour la configuration
  updateConfig(newConfig: Partial<CalendarConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}