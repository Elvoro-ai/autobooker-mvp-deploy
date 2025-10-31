"use client";

import React, { Component, ReactNode, createContext, useContext, useState } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Types
interface ErrorInfo {
  componentStack: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorContextType {
  reportError: (error: Error, context?: string) => void;
  clearError: () => void;
}

// Error Context
const ErrorContext = createContext<ErrorContextType | null>(null);

export function useErrorReporting() {
  const context = useContext(ErrorContext);
  if (!context) {
    return {
      reportError: (error: Error, context?: string) => {
        console.error('Error reported:', error, context);
      },
      clearError: () => {}
    };
  }
  return context;
}

// Error Provider
export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<Error[]>([]);
  
  const reportError = (error: Error, context?: string) => {
    console.error('Error reported:', error, context);
    setErrors(prev => [...prev, error]);
  };
  
  const clearError = () => {
    setErrors([]);
  };
  
  return (
    <ErrorContext.Provider value={{ reportError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
}

// Main Error Boundary
class ErrorBoundaryClass extends Component<
  { children: ReactNode; fallback?: React.ComponentType<any> },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: React.ComponentType<any> }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substr(2, 9)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          resetError={() => this.setState({ hasError: false, error: null, errorInfo: null })}
        />
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = ErrorBoundaryClass;

// Default Error Fallback
function DefaultErrorFallback({ error, resetError }: any) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-slate-800 border-slate-700">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-500/20 rounded-full w-fit">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <CardTitle className="text-white">Oups ! Une erreur s'est produite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-300 text-center">
            Nous sommes désolés, mais quelque chose s'est mal passé.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={resetError} variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="gradient-primary">
              <Home className="w-4 h-4 mr-2" />
              Accueil
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-4 p-3 bg-slate-900 rounded text-xs text-slate-400">
              <summary className="cursor-pointer mb-2">Détails techniques</summary>
              <pre className="whitespace-pre-wrap">{error.toString()}</pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// AI-specific Error Fallback
export function AIErrorFallback({ error, resetError }: any) {
  return (
    <div className="p-6 text-center">
      <div className="mb-4 p-3 bg-red-500/20 rounded-full w-fit mx-auto">
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Assistant IA temporairement indisponible</h3>
      <p className="text-slate-300 mb-4">
        Notre assistant IA rencontre des difficultés. Veuillez réessayer dans quelques instants.
      </p>
      <Button onClick={resetError} variant="gradient-primary" size="sm">
        <RefreshCw className="w-4 h-4 mr-2" />
        Réessayer
      </Button>
    </div>
  );
}

// Loading with Error component
export function LoadingWithError({ 
  isLoading, 
  error, 
  onRetry, 
  children 
}: { 
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 mb-3">{error}</p>
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return <>{children}</>;
}