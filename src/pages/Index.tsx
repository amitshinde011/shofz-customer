import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { repairStorage } from "@/lib/storageHealth";
import { useState, useEffect } from "react";

const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  const [showTimeout, setShowTimeout] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [platformInfo, setPlatformInfo] = useState<string>('');

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    setPlatformInfo(`${platform}${isNative ? ' (native)' : ' (web)'}`);
    
    const timer = setTimeout(() => {
      if (loading) {
        setShowTimeout(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [loading]);

  const handleEmergencyRecovery = async () => {
    setIsRepairing(true);
    
    try {
      const success = await repairStorage();
      
      if (success) {
        window.location.reload();
      } else {
        alert('Recovery failed. Please manually clear site data in browser settings.');
      }
    } catch (error) {
      console.error('[Recovery] Failed:', error);
      alert('Recovery failed. Please reload the page.');
    } finally {
      setIsRepairing(false);
    }
  };

  if (loading && !showTimeout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading && showTimeout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Taking longer than expected</h2>
          <p className="text-muted-foreground mb-4">
            The app is having trouble loading on {platformInfo}.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            This is usually caused by corrupted cache or storage data.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={handleEmergencyRecovery}
              disabled={isRepairing}
              className="w-full"
            >
              {isRepairing ? '🔧 Repairing...' : '🛠️ Clear Cache & Restart'}
            </Button>
            
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              🔄 Just Reload
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? "/home" : "/auth"} replace />;
};

export default Index;
