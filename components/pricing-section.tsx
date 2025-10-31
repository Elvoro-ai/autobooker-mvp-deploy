"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap, Crown, Rocket, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "Parfait pour débuter avec l'automatisation",
    price: "29",
    period: "mois",
    icon: Zap,
    gradient: "from-blue-500 to-cyan-500",
    popular: false,
    features: [
      "500 conversations/mois",
      "1 assistant IA", 
      "Intégration Google Calendar",
      "Support email",
      "Dashboard basique",
      "WhatsApp + SMS"
    ],
    limitations: [
      "Analytics limitées",
      "Pas de branding personnalisé"
    ]
  },
  {
    name: "Pro",
    description: "Le plus populaire pour les entreprises",
    price: "89",
    period: "mois",
    icon: Crown,
    gradient: "from-purple-500 to-pink-500",
    popular: true,
    features: [
      "5,000 conversations/mois",
      "3 assistants IA spécialisés",
      "Multi-calendriers (Google, Outlook)",
      "Support prioritaire 24/7",
      "Analytics avancées",
      "WhatsApp + SMS + Email",
      "Branding personnalisé",
      "Intégrations Zapier",
      "Rappels automatiques"
    ],
    limitations: []
  },
  {
    name: "Enterprise",
    description: "Pour les organisations à grande échelle",
    price: "Custom",
    period: "",
    icon: Rocket,
    gradient: "from-orange-500 to-red-500",
    popular: false,
    features: [
      "Conversations illimitées",
      "Assistants IA illimités",
      "Intégrations sur-mesure",
      "Account manager dédié",
      "SLA 99.9% garanti",
      "Tous les canaux",
      "White-label complet",
      "API privée",
      "Formation équipe incluse",
      "Déploiement on-premise"
    ],
    limitations: []
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

export function PricingSection() {
  return (
    <section className="py-24 px-4" id="pricing">
      <div className="container mx-auto max-w-7xl">
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
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Choisissez le plan qui correspond à vos besoins. Changez quand vous voulez, sans engagement.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 text-green-300">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">14 jours d'essai gratuit • Sans carte bancaire</span>
          </div>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {plans.map((plan, index) => {
            const IconComponent = plan.icon;
            return (
              <motion.div
                key={plan.name}
                variants={cardVariants}
                whileHover={{ 
                  scale: plan.popular ? 1.02 : 1.05,
                  transition: { duration: 0.2 }
                }}
                className={`relative ${plan.popular ? 'lg:-mt-8' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                      ✨ Plus populaire
                    </div>
                  </div>
                )}
                
                <Card className={`h-full relative overflow-hidden ${
                  plan.popular 
                    ? 'bg-gradient-to-b from-purple-900/40 to-pink-900/40 border-purple-500/50 shadow-2xl shadow-purple-500/25' 
                    : 'bg-white/5 border-white/20 hover:border-white/40'
                } backdrop-blur-md transition-all duration-300`}>
                  {plan.popular && (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 pointer-events-none" />
                  )}
                  
                  <CardHeader className="text-center pb-8 relative z-10">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${plan.gradient} p-3 shadow-xl`}>
                      <IconComponent className="w-full h-full text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white mb-2">{plan.name}</CardTitle>
                    <CardDescription className="text-white/70">{plan.description}</CardDescription>
                    <div className="mt-6">
                      <div className="flex items-baseline justify-center gap-1">
                        {plan.price !== "Custom" && (
                          <span className="text-white/60 text-lg">€</span>
                        )}
                        <span className="text-4xl font-bold text-white">{plan.price}</span>
                        {plan.period && (
                          <span className="text-white/60">/{plan.period}</span>
                        )}
                      </div>
                      {plan.price !== "Custom" && (
                        <p className="text-white/50 text-sm mt-1">Facturation mensuelle</p>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 relative z-10">
                    <div className="space-y-4 mb-8">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-white/90 text-sm">{feature}</span>
                        </div>
                      ))}
                      {plan.limitations.map((limitation, idx) => (
                        <div key={idx} className="flex items-start gap-3 opacity-60">
                          <div className="w-5 h-5 mt-0.5 flex-shrink-0 flex items-center justify-center">
                            <div className="w-1 h-3 bg-white/40 rounded" />
                          </div>
                          <span className="text-white/60 text-sm">{limitation}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      variant={plan.popular ? "gradient-primary" : plan.price === "Custom" ? "gradient-success" : "outline"}
                      className={`w-full group ${
                        !plan.popular && plan.price !== "Custom" 
                          ? 'border-white/30 text-white hover:bg-white/10' 
                          : ''
                      }`}
                      size="lg"
                    >
                      {plan.price === "Custom" ? (
                        <>
                          Nous contacter
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </>
                      ) : (
                        <>
                          Commencer {plan.name}
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                    
                    {plan.price !== "Custom" && (
                      <p className="text-center text-white/50 text-xs mt-3">
                        Sans engagement • Annulation à tout moment
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
        
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <p className="text-white/60 mb-4">Questions sur nos tarifs ?</p>
          <Button variant="ghost" className="text-white hover:bg-white/10">
            Programmer un appel gratuit avec notre équipe
          </Button>
        </motion.div>
      </div>
    </section>
  );
}