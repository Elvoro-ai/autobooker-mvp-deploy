"use client";

import { motion } from "framer-motion";
import { 
  Brain, 
  Zap, 
  Shield, 
  BarChart3, 
  Clock, 
  Users, 
  Calendar, 
  MessageSquare,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Brain,
    title: "IA Conversationnelle Avancée",
    description: "Assistant IA qui comprend le contexte et gère les rendez-vous 24/7 avec une précision humaine",
    color: "text-blue-400",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    icon: Zap,
    title: "Automatisation Intelligente",
    description: "Workflows automatisés qui s'adaptent aux préférences de vos clients et optimisent votre planning",
    color: "text-yellow-400",
    gradient: "from-yellow-500 to-orange-500"
  },
  {
    icon: Shield,
    title: "Sécurité Quantique",
    description: "Chiffrement de niveau militaire et protection des données conforme RGPD avec authentification biométrique",
    color: "text-green-400",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    icon: BarChart3,
    title: "Analytics Prédictifs",
    description: "Machine learning qui prédit les tendances de réservation et optimise votre chiffre d'affaires",
    color: "text-purple-400",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    icon: Clock,
    title: "Synchronisation Temporelle",
    description: "Gestion multi-timezone avec API Google Calendar, Outlook et intégration universelle",
    color: "text-indigo-400",
    gradient: "from-indigo-500 to-blue-500"
  },
  {
    icon: Users,
    title: "CRM Intelligent",
    description: "Profiling client automatique avec historique comportemental et recommandations personnalisées",
    color: "text-rose-400",
    gradient: "from-rose-500 to-red-500"
  },
  {
    icon: Calendar,
    title: "Planification Quantique",
    description: "Algorithmes de slot optimization qui maximisent l'efficacité et minimisent les créneaux vides",
    color: "text-teal-400",
    gradient: "from-teal-500 to-cyan-500"
  },
  {
    icon: MessageSquare,
    title: "Omnichannel Messaging",
    description: "WhatsApp, SMS, Email, Slack intégrés avec réponses contextuelles en temps réel",
    color: "text-amber-400",
    gradient: "from-amber-500 to-yellow-500"
  },
  {
    icon: Sparkles,
    title: "Auto-Learning Engine",
    description: "IA qui apprend continuellement de vos clients pour améliorer l'expérience et les conversions",
    color: "text-violet-400",
    gradient: "from-violet-500 to-purple-500"
  }
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 50,
    scale: 0.9
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

export function FeatureShowcase() {
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-7xl">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl font-bold text-white mb-6">
            Technologie de <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Pointe</span>
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Des fonctionnalités IA révolutionnaires qui transforment votre business en machine à conversion
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05, 
                  transition: { duration: 0.2 }
                }}
                className="group"
              >
                <Card className="h-full hover:shadow-2xl transition-all duration-300 border-white/20 hover:border-white/40 bg-white/5 backdrop-blur-md">
                  <CardHeader className="text-center pb-4">
                    <motion.div 
                      className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${feature.gradient} p-3 shadow-xl`}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <IconComponent className="w-full h-full text-white" />
                    </motion.div>
                    <CardTitle className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-white/70 text-center leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}