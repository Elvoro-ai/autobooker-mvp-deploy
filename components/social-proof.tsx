"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Star, TrendingUp, Users, Calendar, MessageSquare, Shield } from "lucide-react";
import Image from "next/image";

const stats = [
  {
    number: "500+",
    label: "Entreprises actives",
    icon: Users,
    color: "text-blue-400"
  },
  {
    number: "50K+",
    label: "RDV automatisés/mois",
    icon: Calendar,
    color: "text-green-400"
  },
  {
    number: "94%",
    label: "Taux de conversion",
    icon: TrendingUp,
    color: "text-purple-400"
  },
  {
    number: "<30s",
    label: "Temps de réponse moyen",
    icon: MessageSquare,
    color: "text-orange-400"
  }
];

const testimonials = [
  {
    name: "Sophie Martin",
    role: "Directrice - Cabinet Médical Saint-Germain",
    avatar: "/api/placeholder/60/60",
    rating: 5,
    text: "AutoBooker a révolutionné notre prise de rendez-vous. Plus de 300 consultations automatisées ce mois-ci, et nos patients adorent la simplicité !",
    stats: "+180% de réservations"
  },
  {
    name: "Marc Dubois",
    role: "Fondateur - Salon Beauty Premium",
    avatar: "/api/placeholder/60/60",
    rating: 5,
    text: "L'IA comprend parfaitement les demandes complexes. Coupe + couleur, soins spécifiques... Elle gère tout en autonomie, même les annulations de dernière minute.",
    stats: "0 appel manqué depuis 3 mois"
  },
  {
    name: "Dr. Amélie Rousseau",
    role: "Orthodontiste - Paris 16ème",
    avatar: "/api/placeholder/60/60",
    rating: 5,
    text: "Mes patients prennent RDV à toute heure, même le weekend. L'assistant IA explique les procédures et bloque les créneaux adaptés automatiquement.",
    stats: "95% satisfaction patients"
  }
];

const badges = [
  {
    name: "RGPD Conforme",
    icon: Shield,
    color: "text-green-400"
  },
  {
    name: "ISO 27001",
    icon: Shield,
    color: "text-blue-400"
  },
  {
    name: "99.9% Uptime",
    icon: TrendingUp,
    color: "text-purple-400"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

export function SocialProof() {
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Stats Section */}
        <motion.div 
          className="mb-20"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl font-bold text-center text-white mb-6">
            Résultats <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Mesurables</span>
          </h2>
          <p className="text-xl text-white/80 text-center max-w-3xl mx-auto mb-16">
            Des entreprises comme la vôtre transforment déjà leur activité avec AutoBooker AI
          </p>
          
          <motion.div 
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  className="text-center group"
                >
                  <Card className="bg-white/5 backdrop-blur border-white/20 hover:border-white/40 transition-all duration-300 p-6">
                    <CardContent className="p-0">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 group-hover:scale-110 transition-transform">
                          <IconComponent className={`w-8 h-8 ${stat.color}`} />
                        </div>
                      </div>
                      <div className={`text-3xl font-bold ${stat.color} mb-2`}>{stat.number}</div>
                      <div className="text-white/70 text-sm font-medium">{stat.label}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>

        {/* Testimonials Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h3 className="text-4xl font-bold text-center text-white mb-4">
            Ce que disent nos clients
          </h3>
          <p className="text-center text-white/70 mb-16">Témoignages 100% authentiques de professionnels qui utilisent AutoBooker</p>
          
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                variants={itemVariants}
                whileHover={{ y: -8 }}
                className="group"
              >
                <Card className="h-full bg-gradient-to-b from-white/10 to-white/5 backdrop-blur border-white/20 group-hover:border-white/40 transition-all duration-300">
                  <CardContent className="p-6">
                    {/* Rating */}
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    
                    {/* Quote */}
                    <blockquote className="text-white/90 mb-6 leading-relaxed italic">
                      "{testimonial.text}"
                    </blockquote>
                    
                    {/* Stats badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-300 text-sm font-medium mb-6">
                      <TrendingUp className="w-3 h-3" />
                      {testimonial.stats}
                    </div>
                    
                    {/* Author */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{testimonial.name}</div>
                        <div className="text-white/60 text-sm">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Trust badges */}
        <motion.div 
          className="mt-20 pt-12 border-t border-white/10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h4 className="text-xl font-semibold text-white mb-2">Sécurité & Conformité</h4>
              <p className="text-white/60">Vos données et celles de vos clients sont protégées</p>
            </div>
            
            <div className="flex flex-wrap gap-6 justify-center">
              {badges.map((badge, index) => {
                const IconComponent = badge.icon;
                return (
                  <motion.div
                    key={badge.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/20"
                  >
                    <IconComponent className={`w-5 h-5 ${badge.color}`} />
                    <span className="text-white font-medium text-sm">{badge.name}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}