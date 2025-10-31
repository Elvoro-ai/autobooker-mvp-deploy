"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, Zap } from "lucide-react";

const floatingVariants = {
  animate: {
    y: [-20, 20, -20],
    rotate: [0, 5, -5, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const slideUp = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
};

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
      {/* Animated floating elements */}
      <motion.div
        className="absolute top-20 left-10 w-20 h-20 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm"
        variants={floatingVariants}
        animate="animate"
      />
      <motion.div
        className="absolute top-40 right-16 w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-sm"
        variants={floatingVariants}
        animate="animate"
        transition={{ delay: 1 }}
      />
      <motion.div
        className="absolute bottom-32 left-20 w-12 h-12 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm"
        variants={floatingVariants}
        animate="animate"
        transition={{ delay: 2 }}
      />

      <div className="container mx-auto max-w-6xl text-center relative z-10">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Badge */}
          <motion.div variants={slideUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium">Technologie IA de Pointe • 2025</span>
          </motion.div>

          {/* Main heading */}
          <motion.h1 variants={slideUp} className="text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-tight">
            Réservations{" "}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              24/7
            </span>
            <br />
            <span className="text-5xl md:text-6xl lg:text-7xl">
              IA, zéro friction.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={slideUp} className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Transformez vos demandes en rendez‑vous confirmés, automatiquement. 
            <span className="text-blue-300 font-semibold"> Assistant IA conversationnel </span> 
            qui comprend, négocie et réserve pendant que vous dormez.
          </motion.p>

          {/* Key benefits */}
          <motion.div variants={slideUp} className="flex flex-wrap justify-center gap-6 text-white/70">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span>Setup en 5 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span>+300% de conversions</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-green-400" />
              <span>RGPD compliant</span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div variants={slideUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              variant="gradient-primary" 
              size="xl" 
              className="group relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 3,
                }}
              />
              <span className="relative z-10 flex items-center gap-2">
                Démarrer gratuitement
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              size="xl"
              className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
            >
              <Play className="w-5 h-5 mr-2" />
              Voir la démo (60s)
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div variants={slideUp} className="pt-8">
            <p className="text-white/60 text-sm mb-4">Utilisé par 500+ entreprises</p>
            <div className="flex justify-center items-center gap-8 opacity-60">
              {/* Placeholder logos */}
              <div className="w-24 h-8 bg-white/20 rounded backdrop-blur-sm"></div>
              <div className="w-20 h-8 bg-white/20 rounded backdrop-blur-sm"></div>
              <div className="w-28 h-8 bg-white/20 rounded backdrop-blur-sm"></div>
              <div className="w-22 h-8 bg-white/20 rounded backdrop-blur-sm"></div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        animate={{
          y: [0, 10, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/60 rounded-full mt-2"></div>
        </div>
      </motion.div>
    </section>
  );
}