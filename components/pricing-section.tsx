"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, Star, Zap, Crown, ArrowRight } from 'lucide-react';

const plans = [
  {
    name: "Starter",
    price: "29",
    period: "/mois",
    description: "Parfait pour débuter",
    badge: null,
    features: [
      "100 réservations/mois",
      "IA conversationnelle basique",
      "1 calendrier connecté",
      "Email de confirmation",
      "Support par email"
    ],
    cta: "Commencer gratuitement",
    variant: "outline" as const,
    popular: false
  },
  {
    name: "Pro",
    price: "79",
    period: "/mois", 
    description: "Le plus populaire",
    badge: "Plus populaire",
    features: [
      "500 réservations/mois",
      "IA avancée + analytics",
      "Calendriers illimités",
      "Email + SMS + WhatsApp",
      "Multi-praticiens",
      "API & intégrations",
      "Support prioritaire 24/7"
    ],
    cta: "Démarrer - 14 jours gratuits",
    variant: "gradient-primary" as const,
    popular: true
  },
  {
    name: "Enterprise",
    price: "199",
    period: "/mois",
    description: "Pour les grandes structures",
    badge: "Recommandé",
    features: [
      "Réservations illimitées",
      "IA personnalisée + ML",
      "Multi-sites + white-label",
      "Tous canaux + webhooks",
      "Analytics avancés",
      "Intégration sur mesure",
      "Account manager dédié",
      "SLA 99.9% garanti"
    ],
    cta: "Parler à un expert",
    variant: "premium" as const,
    popular: false
  }
];

export function PricingSection() {
  return (
    <section className="py-24 px-4 relative">
      <div className="container mx-auto max-w-7xl">
        
        {/* En-tête */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl font-bold text-white mb-6">
            Tarifs <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">Transparents</span>
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto mb-8">
            Choisissez le plan qui correspond à vos besoins. Tous incluent 14 jours d'essai gratuit.
          </p>
          
          {/* Toggle annuel/mensuel */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="text-white/60">Mensuel</span>
            <div className="relative">
              <input type="checkbox" className="sr-only" />
              <div className="w-12 h-6 bg-white/20 rounded-full border border-white/30"></div>
              <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform"></div>
            </div>
            <span className="text-white flex items-center gap-2">
              Annuel 
              <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                -20%
              </span>
            </span>
          </div>
        </motion.div>
        
        {/* Grille de prix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => {
            const isPopular = plan.popular;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ 
                  y: isPopular ? -12 : -8, 
                  scale: isPopular ? 1.03 : 1.02,
                  transition: { duration: 0.2 }
                }}
                className="relative group"
              >
                {/* Badge populaire */}
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                      isPopular 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    }`}>
                      {plan.badge}
                    </div>
                  </div>
                )}
                
                <div className={`h-full rounded-2xl p-8 transition-all duration-300 ${
                  isPopular
                    ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl border-2 border-blue-500/50 shadow-lg shadow-blue-500/20'
                    : 'bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 hover:border-white/40'
                }`}>
                  
                  {/* En-tête du plan */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-white/60 mb-4">{plan.description}</p>
                    
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold text-white">{plan.price}€</span>
                      <span className="text-white/60">{plan.period}</span>
                    </div>
                    
                    <p className="text-white/50 text-sm mt-2">puis {plan.price}€/mois</p>
                  </div>
                  
                  {/* Liste des fonctionnalités */}
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.li 
                        key={featureIndex}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: (index * 0.1) + (featureIndex * 0.05) }}
                        viewport={{ once: true }}
                        className="flex items-center gap-3 text-white/90"
                      >
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                          isPopular ? 'bg-blue-500' : 'bg-green-500'
                        }`}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span>{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                  
                  {/* CTA */}
                  <Button 
                    variant={plan.variant}
                    size="lg" 
                    className="w-full group"
                  >
                    {plan.cta}
                    {plan.name !== 'Enterprise' && (
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    )}
                  </Button>
                  
                  {/* Garanties */}
                  <div className="text-center mt-4 space-y-1">
                    <p className="text-white/50 text-xs">✅ Sans engagement</p>
                    <p className="text-white/50 text-xs">✅ Support inclus</p>
                    {isPopular && <p className="text-blue-400 text-xs font-semibold">✨ Setup personnalisé offert</p>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {/* Indicateurs de confiance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto mt-16"
        >
          {trustIndicators.map((indicator, index) => {
            const Icon = indicator.icon;
            
            return (
              <div key={index} className="text-center group">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur border border-white/20 rounded-lg flex items-center justify-center group-hover:border-white/40 transition-all duration-300">
                    <Icon className={`w-6 h-6 ${indicator.color}`} />
                  </div>
                </div>
                
                <h4 className="text-white font-semibold text-sm mb-1">{indicator.title}</h4>
                <p className="text-white/50 text-xs">{indicator.description}</p>
              </div>
            );
          })}
        </motion.div>
        
        {/* Garantie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-full px-6 py-3">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="text-white font-semibold">Garantie satisfait ou remboursé 30 jours</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}