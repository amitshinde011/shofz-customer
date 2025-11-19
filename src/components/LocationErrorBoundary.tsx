import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for LocationProvider
 *
 * Catches errors from location-related code and shows fallback UI.
 * This prevents the entire app from crashing when location feature fails.
 *
 * FIX #5: Critical production blocker - app crashes if location throws
 */
export class LocationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('[LocationErrorBoundary] Caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[LocationErrorBoundary] Error details:', error, errorInfo);
  }

  handleReset = () => {
    // Clear location cache and flags
    try {
      localStorage.removeItem('userLocation');
      localStorage.removeItem('location_permission_granted');
      localStorage.removeItem('skip_location_permission');
    } catch (e) {
      console.error('[LocationErrorBoundary] Failed to clear storage:', e);
    }

    // Reset error state
    this.setState({ hasError: false, error: null });

    // Reload page to restart app
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-destructive/10 flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-6 text-center">
            {/* Icon */}
            <div className="relative">
              <AlertTriangle className="w-20 h-20 mx-auto text-destructive" />
              <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full" />
            </div>

            {/* Heading */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-foreground">
                Location Error
              </h1>
              <p className="text-muted-foreground text-lg">
                Something went wrong with the location feature, but don't worry - you can still use the app!
              </p>
            </div>

            {/* Error details (in dev mode) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 text-left">
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              <Button
                onClick={this.handleReset}
                size="lg"
                className="w-full text-base font-semibold h-12"
              >
                Reset and Continue
              </Button>

              <p className="text-xs text-muted-foreground">
                This will clear location data and reload the app. You can continue browsing without location.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
