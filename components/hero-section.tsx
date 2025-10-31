"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, CheckCircle, Star, Zap } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="container mx-auto max-w-6xl text-center">
        
        {/* Badges de crédibilité */}
        <motion.div 
          className="flex flex-wrap justify-center gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-white text-sm font-semibold">4.9/5 • 500+ entreprises</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-white text-sm font-semibold">Setup en 5min</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2">
            <CheckCircle className="w-4 h-4 text-blue-400" />
            <span className="text-white text-sm font-semibold">RGPD Compliant</span>
          </div>
        </motion.div>
        
        {/* Titre principal */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Réservations 24/7.
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
              IA, zéro friction.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed">
            Transformez vos demandes en rendez-vous confirmés, automatiquement. 
            Assistant IA conversationnel qui comprend, négocie et réserve pendant que vous dormez.
          </p>
        </motion.div>
        
        {/* Promesses chiffrées */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto"
        >
          <div className="bg-white/5 backdrop-blur border border-white/20 rounded-2xl p-6">
            <div className="text-3xl font-bold text-green-400 mb-2">+300%</div>
            <div className="text-white/80">Conversions clients</div>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/20 rounded-2xl p-6">
            <div className="text-3xl font-bold text-blue-400 mb-2">0</div>
            <div className="text-white/80">Appel manqué</div>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/20 rounded-2xl p-6">
            <div className="text-3xl font-bold text-purple-400 mb-2">&lt;30s</div>
            <div className="text-white/80">Temps de réponse</div>
          </div>
        </motion.div>
        
        {/* CTAs principaux */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
        >
          <Button variant="gradient-primary" size="xl" className="group">
            Démarrer gratuitement - 14 jours
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <Button variant="glass" size="xl" className="group">
            <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Voir démo 60 secondes
          </Button>
        </motion.div>
        
        {/* Réassurance */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-white/60 text-sm"
        >
          ✅ Sans carte bancaire • ✅ Annulation à tout moment • ✅ Support 24/7
        </motion.p>
      </div>
    </section>
  );
}