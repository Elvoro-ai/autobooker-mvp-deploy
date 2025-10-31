"use client";

import { motion } from 'framer-motion';
import { 
  MessageCircle, Calendar, Brain, Shield, 
  BarChart, Globe, Clock, Smartphone, Zap 
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: "IA Conversationnelle Avancée",
    description: "Comprend le langage naturel, extrait les intentions et gère les créneaux complexes avec une précision de 94%",
    color: "from-blue-400 to-cyan-400"
  },
  {
    icon: Calendar, 
    title: "Synchronisation Multi-Calendriers",
    description: "Google Calendar, Outlook, Apple Calendar - synchronisation bidirectionnelle en temps réel avec gestion des conflits",
    color: "from-green-400 to-emerald-400"
  },
  {
    icon: MessageCircle,
    title: "Notifications Multi-Canal",
    description: "Email, SMS, WhatsApp Business - confirmations instantanées et rappels automatiques personnalisés",
    color: "from-purple-400 to-pink-400"
  },
  {
    icon: BarChart,
    title: "Analytics Prédictifs",
    description: "Analyse des patterns de réservation, optimisation des créneaux et prédiction de la demande avec ML",
    color: "from-orange-400 to-red-400"
  },
  {
    icon: Shield,
    title: "Sécurité Quantique",
    description: "Chiffrement AES-256, conformité RGPD, audit trails et protection contre les attaques DDoS",
    color: "from-indigo-400 to-purple-400"
  },
  {
    icon: Globe,
    title: "Multi-Langues & Fuseaux",
    description: "15+ langues supportées, gestion automatique des fuseaux horaires et adaptation culturelle",
    color: "from-teal-400 to-blue-400"
  },
  {
    icon: Clock,
    title: "Disponibilité 24/7",
    description: "Infrastructure cloud distribuée, 99.9% uptime, failover automatique et monitoring continu",
    color: "from-yellow-400 to-orange-400"
  },
  {
    icon: Smartphone,
    title: "API & Intégrations",
    description: "200+ intégrations, webhooks, API REST complète et SDK pour développeurs avec documentation",
    color: "from-pink-400 to-rose-400"
  },
  {
    icon: Zap,
    title: "Performance Ultra-Rapide",
    description: "Réponse < 2s, optimisation Edge, CDN global et architecture serverless auto-scalante",
    color: "from-cyan-400 to-blue-400"
  }
];

export function FeatureShowcase() {
  return (
    <section className="py-24 px-4 relative">
      <div className="container mx-auto max-w-7xl">
        
        {/* En-tête de section */}
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl font-bold text-white mb-6">
            Technologie <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Révolutionnaire</span>
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            9 fonctionnalités IA de pointe qui transforment chaque interaction en opportunité commerciale
          </p>
        </motion.div>
        
        {/* Grille de fonctionnalités */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                viewport={{ once: true }}
                whileHover={{ 
                  y: -8, 
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
                className="group"
              >
                <div className="h-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:border-white/40 transition-all duration-300">
                  
                  {/* Icône avec gradient */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.color} p-4 mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-full h-full text-white" />
                  </div>
                  
                  {/* Contenu */}
                  <h3 className="text-xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-white/70 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {/* Stats impressionnants */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                50K+
              </div>
              <div className="text-white/60">RDV/mois traités</div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                94%
              </div>
              <div className="text-white/60">Taux de conversion</div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                &lt;2s
              </div>
              <div className="text-white/60">Temps de réponse</div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2">
                99.9%
              </div>
              <div className="text-white/60">Disponibilité</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}