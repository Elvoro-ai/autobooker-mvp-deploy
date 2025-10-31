"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Générer un ID unique pour l'erreur
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Logger l'erreur avec détails pour le débogage
    this.logError(error, errorInfo);
  }

  private logError(error: Error, errorInfo: React.ErrorInfo) {
    const errorData = {
      id: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown'
    };
    
    console.error('🚨 React Error Boundary triggered:', errorData);
    
    // En production, envoyer vers un service de monitoring
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Envoyer l'erreur vers le service de monitoring
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(err => console.error('Failed to log error to monitoring service:', err));
    }
  }

  private resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: ''
    });
  };

  private reloadPage = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private goHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      // Utiliser le fallback personnalisé si fourni
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} reset={this.resetError} />;
      }

      // Interface d'erreur par défaut
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl"
          >
            <Card className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/30 backdrop-blur">
              <CardHeader className="text-center pb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center"
                >
                  <AlertTriangle className="w-10 h-10 text-white" />
                </motion.div>
                
                <CardTitle className="text-3xl font-bold text-white mb-2">
                  Oups ! Quelque chose s'est mal passé
                </CardTitle>
                
                <CardDescription className="text-white/70 text-lg">
                  Ne vous inquiétez pas, notre équipe technique a été automatiquement notifiée.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Informations pour l'utilisateur */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-white font-semibold mb-2">🔍 Ce qui s'est passé :</h3>
                  <p className="text-white/80 text-sm mb-2">
                    Une erreur technique inattendue s'est produite dans l'interface.
                  </p>
                  <p className="text-white/60 text-xs font-mono">
                    ID d'erreur: {this.state.errorId}
                  </p>
                </div>
                
                {/* Actions utilisateur */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    onClick={this.resetError}
                    variant="gradient-primary"
                    className="w-full group"
                  >
                    <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                    Réessayer
                  </Button>
                  
                  <Button
                    onClick={this.reloadPage}
                    variant="outline"
                    className="w-full border-white/30 text-white hover:bg-white/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recharger la page
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    onClick={this.goHome}
                    variant="ghost"
                    className="w-full text-white hover:bg-white/10"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Retour à l'accueil
                  </Button>
                  
                  <Button
                    onClick={() => window.open('mailto:support@autobooker.ai?subject=Erreur%20technique%20-%20' + this.state.errorId, '_blank')}
                    variant="ghost"
                    className="w-full text-white hover:bg-white/10"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contacter le support
                  </Button>
                </div>
                
                {/* Informations de débogage (seulement en dev) */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="bg-black/20 rounded-lg p-4 border border-red-500/20">
                    <summary className="text-red-400 font-semibold cursor-pointer mb-2">
                      Détails techniques (développement)
                    </summary>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-red-300 font-semibold">Message:</span>
                        <pre className="text-white/80 mt-1 p-2 bg-black/30 rounded overflow-auto">
                          {this.state.error.message}
                        </pre>
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <span className="text-red-300 font-semibold">Stack:</span>
                          <pre className="text-white/80 mt-1 p-2 bg-black/30 rounded overflow-auto max-h-32">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
                
                {/* Mesures prises */}
                <div className="text-center pt-4 border-t border-white/10">
                  <p className="text-white/60 text-sm mb-2">
                    ✅ Équipe technique notifiée automatiquement
                  </p>
                  <p className="text-white/60 text-sm mb-2">
                    ✅ Logs d'erreur enregistrés pour analyse
                  </p>
                  <p className="text-white/60 text-sm">
                    ✅ Monitoring activé pour prévenir les récurrences
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Composant d'erreur spécifique pour l'IA
export function AIErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-white" />
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-white mb-2">
            Assistant IA temporairement indisponible
          </h3>
          <p className="text-white/70 mb-4">
            L'assistant IA rencontre un problème technique. L'équipe a été notifiée.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="gradient-primary" className="group">
            <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
            Réessayer
          </Button>
          
          <Button
            onClick={() => window.open('mailto:support@autobooker.ai?subject=Erreur%20Assistant%20IA', '_blank')}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Signaler le problème
          </Button>
        </div>
        
        <p className="text-white/50 text-sm">
          En attendant, vous pouvez nous contacter directement pour vos réservations.
        </p>
      </motion.div>
    </div>
  );
}

// Hook pour gérer les erreurs dans les composants fonctionnels
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, errorInfo?: any) => {
    const errorId = `hook_error_${Date.now()}`;
    
    const errorData = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      errorInfo,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };
    
    console.error('🚨 Hook error handler:', errorData);
    
    // Envoyer l'erreur vers le monitoring
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(err => console.error('Failed to log hook error:', err));
    }
    
    return errorId;
  }, []);

  return { handleError };
}

// Composant de chargement avec gestion d'erreur
export function LoadingWithError({
  isLoading,
  error,
  onRetry,
  children
}: {
  isLoading: boolean;
  error?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-6"
      >
        <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-white" />
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-2">Erreur de chargement</h3>
        <p className="text-white/70 mb-4">{error}</p>
        
        {onRetry && (
          <Button onClick={onRetry} variant="gradient-primary" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        )}
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center p-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 mx-auto mb-4 border-4 border-blue-500/30 border-t-blue-500 rounded-full"
        />
        <p className="text-white/70">Chargement en cours...</p>
      </div>
    );
  }

  return <>{children}</>;
}

// Provider d'erreur globale
const ErrorContext = React.createContext<{
  reportError: (error: Error, context?: string) => void;
}>({ 
  reportError: () => {} 
});

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const reportError = React.useCallback((error: Error, context?: string) => {
    const errorId = `context_error_${Date.now()}`;
    
    const errorData = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };
    
    console.error('🚨 Context error reported:', errorData);
    
    // En production, envoyer vers le monitoring
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(err => console.error('Failed to report context error:', err));
    }
  }, []);

  return (
    <ErrorContext.Provider value={{ reportError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorReporting() {
  return React.useContext(ErrorContext);
}