import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoadingTooLong(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setLoadingTooLong(false);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
          
          {loadingTooLong && (
            <div className="space-y-2">
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                Taking longer than expected...
              </p>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="text-sm text-primary underline hover:no-underline"
              >
                Clear cache and reload
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Redirect to /home if authenticated, otherwise to /auth
  return <Navigate to={isAuthenticated ? "/home" : "/auth"} replace />;
};

export default Index;
