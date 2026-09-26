/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Global Error Boundary Component
 * Prevents white screen and allows graceful recovery
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Unhandled React ErrorBoundary caught an exception', {
      error: error.message,
      componentStack: errorInfo.componentStack
    });
  }

  public handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex items-center justify-center p-6 w-full">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">
                {this.props.fallbackTitle || 'Não foi possível carregar este módulo.'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1 font-mono break-words">
                {this.state.error?.message || 'Ocorreu uma falha inesperada na renderização da interface.'}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
