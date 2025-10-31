"use client";

import { motion } from 'framer-motion';
import { Star, Quote, CheckCircle, Shield, Award, TrendingUp } from 'lucide-react';

const testimonials = [
  {
    name: "Marie Dubois",
    role: "Directrice, Clinique Saint-Martin",
    content: "AutoBooker a transformé notre planning. +250% de réservations en 3 mois, zéro appel manqué. L'IA comprend même les demandes complexes de nos patients.",
    rating: 5,
    results: "+250% réservations"
  },
  {
    name: "Thomas Laurent",
    role: "Fondateur, Cabinet Laurent & Associés",
    content: "Impressionnant ! L'assistant gère nos 4 praticiens et 3 sites automatiquement. Nos clients adorent la simplicité. ROI positif dès le premier mois.",
    rating: 5,
    results: "ROI mois 1"
  },
  {
    name: "Dr. Sophie Martin",
    role: "Médecin spécialiste",
    content: "Plus de stress avec les rendez-vous. L'IA s'adapte à mes contraintes, gère les urgences et envoie les rappels. Je me concentre sur mes patients.",
    rating: 5,
    results: "0 stress planning"
  }
];

const trustIndicators = [
  {
    icon: Shield,
    title: "RGPD Compliant",
    description: "Certification complète",
    color: "text-green-400"
  },
  {
    icon: Award,
    title: "ISO 27001",
    description: "Sécurité certifiée",
    color: "text-blue-400"
  },
  {
    icon: TrendingUp,
    title: "99.9% Uptime",
    description: "Disponibilité garantie",
    color: "text-purple-400"
  }
];

export function SocialProof() {
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
            Ils ont transformé leur <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">business</span>
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            500+ entreprises font confiance à AutoBooker pour automatiser leurs réservations
          </p>
        </motion.div>
        
        {/* Témoignages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group"
            >
              <div className="h-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:border-white/40 transition-all duration-300">
                
                {/* Badge résultat */}
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full px-4 py-2 mb-6">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-semibold text-sm">{testimonial.results}</span>
                </div>
                
                {/* Étoiles */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                {/* Contenu */}
                <blockquote className="text-white/90 mb-6 leading-relaxed relative">
                  <Quote className="w-6 h-6 text-blue-400/50 absolute -top-2 -left-2" />
                  "{testimonial.content}"
                </blockquote>
                
                {/* Auteur */}
                <div className="border-t border-white/10 pt-4">
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-white/60 text-sm">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Indicateurs de confiance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
        >
          {trustIndicators.map((indicator, index) => {
            const Icon = indicator.icon;
            
            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className="text-center group"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur border border-white/20 rounded-xl flex items-center justify-center group-hover:border-white/40 transition-all duration-300">
                    <Icon className={`w-8 h-8 ${indicator.color}`} />
                  </div>
                </div>
                
                <h3 className="text-white font-semibold mb-2">{indicator.title}</h3>
                <p className="text-white/60 text-sm">{indicator.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}