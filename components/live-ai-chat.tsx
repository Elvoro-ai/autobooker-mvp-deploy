"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, Bot, User, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ErrorBoundary, AIErrorFallback, LoadingWithError, useErrorReporting } from '@/components/error-boundary';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

interface ChatResponse {
  response: string;
  sessionId: string;
  context: any;
  actions?: Array<{ type: string; status: string; data?: any }>;
}

function LiveAIChatInner() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant AutoBooker. Je peux vous aider à prendre, modifier ou annuler un rendez-vous. Comment puis-je vous aider aujourd\'hui ?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { reportError } = useErrorReporting();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          sessionId: sessionId,
          context: context
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Trop de messages. Veuillez patienter quelques instants.');
        } else if (response.status === 400) {
          throw new Error('Message invalide. Veuillez réessayer avec un message différent.');
        } else {
          throw new Error(`Erreur de communication avec l'IA (${response.status})`);
        }
      }

      const data: ChatResponse = await response.json();

      // Mettre à jour le statut du message utilisateur
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );

      // Ajouter la réponse de l'IA
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Mettre à jour la session et le contexte
      setSessionId(data.sessionId);
      setContext(data.context);

      // Afficher les actions exécutées
      if (data.actions && data.actions.length > 0) {
        console.log('Actions exécutées:', data.actions);
        
        // Afficher un message de confirmation si une réservation a été créée
        const bookingAction = data.actions.find(action => action.type === 'create_booking');
        if (bookingAction && bookingAction.status === 'success') {
          const confirmationMessage: Message = {
            id: `confirmation_${Date.now()}`,
            role: 'assistant',
            content: '✅ Parfait ! Votre rendez-vous a été créé avec succès. Vous recevrez une confirmation par email sous peu.',
            timestamp: new Date()
          };
          
          setTimeout(() => {
            setMessages(prev => [...prev, confirmationMessage]);
          }, 1000);
        }
      }

    } catch (error) {
      const err = error as Error;
      console.error('Erreur lors de l\'envoi du message:', err);
      reportError(err, 'ai_chat_send_message');
      
      // Marquer le message utilisateur comme erreur
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'error' }
            : msg
        )
      );
      
      setError(err.message);
      
      // Ajouter un message d'erreur
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `Désolé, j'ai rencontré un problème : ${err.message}. Pouvez-vous réessayer ?`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Bonjour ! Je suis votre assistant AutoBooker. Je peux vous aider à prendre, modifier ou annuler un rendez-vous. Comment puis-je vous aider aujourd\'hui ?',
        timestamp: new Date()
      }
    ]);
    setSessionId(null);
    setContext(null);
    setInputMessage('');
    setError(null);
  };

  const retryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    if (lastUserMessage) {
      setInputMessage(lastUserMessage.content);
      setError(null);
    }
  };

  const getMessageIcon = (message: Message) => {
    if (message.role === 'assistant') {
      return <Bot className="w-6 h-6 text-blue-400" />;
    }
    
    switch (message.status) {
      case 'sending':
        return <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />;
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <User className="w-6 h-6 text-gray-400" />;
    }
  };

  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl font-bold text-white mb-6">
            Testez l'IA en <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">Direct</span>
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Discutez avec notre assistant IA et voyez comment il gère une réservation complète en temps réel
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <LoadingWithError
            isLoading={false}
            error={error}
            onRetry={retryLastMessage}
          >
            <Card className="bg-gradient-to-b from-slate-800/80 to-slate-900/80 backdrop-blur border-slate-700 overflow-hidden h-[600px] flex flex-col">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">AutoBooker Assistant</CardTitle>
                      <div className="flex items-center gap-2 text-blue-100 text-sm">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>En ligne • Temps de réponse &lt; 2s</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={resetChat}
                    variant="ghost" 
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    Nouveau chat
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex-shrink-0 mt-1">
                            {getMessageIcon(message)}
                          </div>
                        )}
                        
                        <div className={`max-w-sm lg:max-w-md px-4 py-3 rounded-2xl ${
                          message.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-br-md' 
                            : 'bg-slate-700 text-white rounded-bl-md'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString('fr-FR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                            {message.role === 'user' && (
                              <div className="flex-shrink-0">
                                {getMessageIcon(message)}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="flex items-center gap-3">
                        <Bot className="w-6 h-6 text-blue-400" />
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
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Input */}
                <div className="border-t border-slate-700 p-4">
                  <div className="flex gap-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Tapez votre message... (ex: Je voudrais prendre RDV demain à 14h)"
                      className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                      maxLength={2000}
                    />
                    <Button 
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      variant="gradient-primary"
                      className="px-6"
                      loading={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    💡 Essayez: "Je voudrais un RDV vendredi à 15h" ou "Quels sont vos horaires?"
                  </p>
                </div>
              </CardContent>
            </Card>
          </LoadingWithError>
        </motion.div>
        
        <motion.div 
          className="text-center mt-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <p className="text-white/60 mb-4">🚀 Cette démo utilise notre vraie IA de production</p>
          <div className="flex justify-center gap-4 text-sm text-white/50">
            <span>✅ Détection d'intention</span>
            <span>✅ Extraction d'entités</span>
            <span>✅ Gestion de calendrier</span>
            <span>✅ Notifications automatiques</span>
          </div>
        </motion.div>
      </div>
    </section>
  );

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }
}

export function LiveAIChat() {
  return (
    <ErrorBoundary fallback={AIErrorFallback}>
      <LiveAIChatInner />
    </ErrorBoundary>
  );
}