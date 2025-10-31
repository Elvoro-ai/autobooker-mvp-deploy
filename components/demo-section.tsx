"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Calendar, CheckCircle, Smartphone, Clock, User } from "lucide-react";

interface ChatMessage {
  id: number;
  sender: 'client' | 'ai';
  message: string;
  timestamp: string;
  type?: 'text' | 'booking' | 'confirmation';
}

const demoMessages: ChatMessage[] = [
  {
    id: 1,
    sender: 'client',
    message: 'Salut, je voudrais prendre RDV pour une consultation demain si possible',
    timestamp: '14:23',
    type: 'text'
  },
  {
    id: 2,
    sender: 'ai',
    message: 'Bonjour ! Je peux vous proposer plusieurs créneaux demain vendredi 1er novembre :',
    timestamp: '14:23',
    type: 'text'
  },
  {
    id: 3,
    sender: 'ai',
    message: '📅 9h00-10h00\n📅 14h30-15h30\n📅 16h00-17h00\n\nLequel vous convient le mieux ?',
    timestamp: '14:24',
    type: 'booking'
  },
  {
    id: 4,
    sender: 'client',
    message: 'Le 14h30 c\'est parfait !',
    timestamp: '14:25',
    type: 'text'
  },
  {
    id: 5,
    sender: 'ai',
    message: '✅ Parfait ! Votre rendez-vous est confirmé :\n\n📅 Vendredi 1er novembre\n🕐 14h30-15h30\n👤 Consultation\n\nVous recevrez une confirmation par email et SMS.',
    timestamp: '14:25',
    type: 'confirmation'
  }
];

const stats = [
  { label: 'Temps de réponse', value: '<30s', icon: Clock, color: 'text-blue-400' },
  { label: 'Taux de conversion', value: '94%', icon: CheckCircle, color: 'text-green-400' },
  { label: 'Satisfaction client', value: '4.9/5', icon: User, color: 'text-purple-400' }
];

export function DemoSection() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayedMessages, setDisplayedMessages] = useState<ChatMessage[]>([]);

  const startDemo = () => {
    setIsPlaying(true);
    setCurrentMessageIndex(0);
    setDisplayedMessages([]);
  };

  const resetDemo = () => {
    setIsPlaying(false);
    setCurrentMessageIndex(-1);
    setDisplayedMessages([]);
  };

  useEffect(() => {
    if (isPlaying && currentMessageIndex >= 0 && currentMessageIndex < demoMessages.length) {
      const timer = setTimeout(() => {
        setDisplayedMessages(prev => [...prev, demoMessages[currentMessageIndex]]);
        if (currentMessageIndex < demoMessages.length - 1) {
          setCurrentMessageIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, currentMessageIndex === 0 ? 500 : 1500); // Premier message plus rapide

      return () => clearTimeout(timer);
    }
  }, [currentMessageIndex, isPlaying]);

  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-7xl">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl font-bold text-white mb-6">
            Voyez l'IA en <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Action</span>
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Découvrez comment notre assistant IA gère une réservation complète en temps réel
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Chat Demo */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Card className="bg-gradient-to-b from-slate-800/80 to-slate-900/80 backdrop-blur border-slate-700 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6" />
                  <div>
                    <CardTitle className="text-lg">AutoBooker Assistant</CardTitle>
                    <p className="text-blue-100 text-sm opacity-90">En ligne • Répond en 30s</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                  <AnimatePresence>
                    {displayedMessages.map((msg, index) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-sm px-4 py-3 rounded-2xl ${
                          msg.sender === 'client' 
                            ? 'bg-blue-600 text-white rounded-br-md' 
                            : msg.type === 'confirmation'
                            ? 'bg-green-600/20 border border-green-500/30 text-white rounded-bl-md'
                            : 'bg-slate-700 text-white rounded-bl-md'
                        }`}>
                          <p className="text-sm whitespace-pre-line">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {isPlaying && displayedMessages.length < demoMessages.length && (
                    <motion.div 
                      className="flex justify-start"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-md">
                        <div className="flex space-x-1">
                          <motion.div 
                            className="w-2 h-2 bg-white/60 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity }}
                          />
                          <motion.div 
                            className="w-2 h-2 bg-white/60 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.div 
                            className="w-2 h-2 bg-white/60 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
                
                <div className="p-4 border-t border-slate-700 flex gap-3">
                  {!isPlaying && displayedMessages.length === 0 && (
                    <Button 
                      onClick={startDemo} 
                      variant="gradient-primary" 
                      className="w-full"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Lancer la démonstration
                    </Button>
                  )}
                  {displayedMessages.length > 0 && (
                    <Button 
                      onClick={resetDemo} 
                      variant="outline" 
                      className="w-full border-slate-600 text-white hover:bg-slate-700"
                    >
                      Recommencer la démo
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats & Benefits */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <h3 className="text-3xl font-bold text-white mb-6">Performance en Temps Réel</h3>
              <div className="space-y-4">
                {stats.map((stat, index) => {
                  const IconComponent = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10"
                    >
                      <div className={`p-3 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800`}>
                        <IconComponent className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-white font-semibold">{stat.value}</p>
                        <p className="text-white/70 text-sm">{stat.label}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur border border-blue-500/30">
              <h4 className="text-xl font-bold text-white mb-4">✨ Ce qui se passe en arrière-plan</h4>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <span>Analyse sémantique de l'intention client</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <span>Optimisation automatique des créneaux</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <span>Synchronisation multi-calendriers</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <span>Notifications automatiques (SMS + Email)</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}