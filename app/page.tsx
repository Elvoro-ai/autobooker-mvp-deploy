"use client";

import { AnimatedBackground } from "@/components/animated-background";
import { HeroSection } from "@/components/hero-section";
import { FeatureShowcase } from "@/components/feature-showcase";
import { DemoSection } from "@/components/demo-section";
import { SocialProof } from "@/components/social-proof";
import { PricingSection } from "@/components/pricing-section";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <HeroSection />
        
        {/* AI Demo Section */}
        <DemoSection />
        
        {/* Feature Showcase */}
        <FeatureShowcase />
        
        {/* Social Proof & Testimonials */}
        <SocialProof />
        
        {/* Pricing Section */}
        <PricingSection />
        
        {/* CTA Footer */}
        <section className="py-24 px-4 relative">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl border border-white/20 rounded-3xl p-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Prêt à transformer votre business ?
              </h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Rejoignez les 500+ entreprises qui automatisent déjà leurs réservations avec l'IA la plus avancée du marché.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="gradient-primary" size="xl" className="group">
                  Démarrer gratuitement - 14 jours
                  <ArrowUp className="w-5 h-5 ml-2 group-hover:translate-y-[-2px] transition-transform" />
                </Button>
                <Button variant="outline" size="xl" className="border-white/30 text-white hover:bg-white/10">
                  Parler à un expert
                </Button>
              </div>
              <p className="text-white/60 text-sm mt-4">
                Configuration en 5 minutes • Sans carte bancaire • Support 24/7
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      
      {/* Scroll to Top Button */}
      <motion.button
        onClick={scrollToTop}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: showScrollTop ? 1 : 0, 
          scale: showScrollTop ? 1 : 0.8 
        }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-8 right-8 z-50 p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
        style={{ pointerEvents: showScrollTop ? 'auto' : 'none' }}
      >
        <ArrowUp className="w-6 h-6" />
      </motion.button>
    </>
  );
}