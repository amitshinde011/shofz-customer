import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { safeLocalStorage } from '@/hooks/useLocation';
import { LOCATION_CONFIG } from '@/config/locationConfig';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class LocationErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LocationErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleContinue = () => {
    // Clear location storage and set skip flag
    safeLocalStorage.removeItem(LOCATION_CONFIG.STORAGE_KEYS.LOCATION);
    safeLocalStorage.setItem('shofz_skip_location_permission', 'true');
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-4 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Location Service Unavailable
              </h2>
              <p className="text-sm text-muted-foreground">
                The location service encountered an error. You can continue browsing without location features.
              </p>
              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4 text-left text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Error details</summary>
                  <pre className="mt-2 overflow-auto rounded bg-muted p-2">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={this.handleContinue} variant="outline" className="flex-1">
                Continue without location
              </Button>
              <Button onClick={this.handleReset} className="flex-1">
                Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
