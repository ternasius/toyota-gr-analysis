/**
 * ErrorBoundary Component
 * 
 * React Error Boundary to catch and handle component errors gracefully.
 * Displays a fallback UI when errors occur and logs errors to console.
 * 
 * Requirement 7.3: Display fallback UI on component errors and log errors
 */

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console (Requirement 7.3)
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    // Update state with error info
    this.setState({
      errorInfo,
    });
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }
  
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };
  
  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI (Requirement 7.3)
      return (
        <div className="min-h-screen bg-racing-bg flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900 border border-red-900 rounded-lg p-6 space-y-4">
            {/* Error icon and title */}
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-900/50 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-racing-red" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Something went wrong
                </h2>
                <p className="text-sm text-gray-400">
                  An unexpected error occurred
                </p>
              </div>
            </div>
            
            {/* Error details */}
            {this.state.error && (
              <div className="bg-black/50 rounded p-3 border border-gray-800">
                <p className="text-xs font-mono text-red-400 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-racing-red hover:bg-red-700 text-white rounded transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Reload Page
              </button>
            </div>
            
            {/* Additional info in development */}
            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-400 hover:text-white">
                  Stack trace (dev only)
                </summary>
                <pre className="mt-2 p-2 bg-black/50 rounded border border-gray-800 overflow-auto text-gray-500">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}
