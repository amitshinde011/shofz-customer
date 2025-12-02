import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import ConnectionStatus from "@/components/ConnectionStatus";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { usePageTracking } from "@/hooks/useAnalytics";
import { initializeAnalytics } from "@/lib/analytics";
import { LocationProvider } from "@/contexts/LocationContext";
import { LocationPermissionGate } from "@/components/LocationPermissionGate";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Shops from "./pages/Shops";
import ShopDetail from "./pages/ShopDetail";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import InquiryForm from "./pages/InquiryForm";
import InquirySuccess from "./pages/InquirySuccess";
import MyInquiries from "./pages/MyInquiries";
import InquiryDetail from "./pages/InquiryDetail";
import Offers from "./pages/Offers";
import OfferDetail from "./pages/OfferDetail";
import ShopDashboard from "./pages/ShopDashboard";
import CustomerSupport from "./pages/CustomerSupport";
import ReferralHistory from "./pages/ReferralHistory";
import SearchResults from "./pages/SearchResults";
import { useIsMobile } from "@/hooks/use-mobile";

// Initialize Google Analytics
initializeAnalytics();

// Enhanced QueryClient with optimized cache settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LocationProvider>
            <LocationPermissionGate>
              <OfflineIndicator />
              <ConnectionStatus />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </LocationPermissionGate>
          </LocationProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
};

function AppContent() {
  // Track page views automatically
  usePageTracking();
  const { loading, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();

  // Check session on window focus (user returns to tab)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleFocus = async () => {
      console.log('[App] Window focused - checking session health');
      const { checkSessionHealth, attemptTokenRefresh } = await import('@/lib/sessionValidator');
      const { supabase } = await import('@/integrations/supabase/client');
      
      const health = await checkSessionHealth();
      
      if (health.isExpired) {
        console.warn('[App] Session may be expired - attempting refresh');
        const refreshed = await attemptTokenRefresh();
        
        if (!refreshed) {
          // Only reload if refresh fails AND session is truly gone
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.error('[App] No valid session - reloading');
            window.location.reload();
          }
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div
      className="font-inter min-h-screen pb-20 md:pb-0"
      style={
        isMobile
          ? { paddingBottom: "calc(4rem + env(safe-area-inset-bottom))" }
          : undefined
      }
    >
      <PWAInstallBanner />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/shops" element={<Shops />} />
        <Route path="/shops/:id" element={<ShopDetail />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/offers/:id" element={<OfferDetail />} />
        {/* Auth Routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Protected Routes */}
        <Route path="/inquiry/new" element={<ProtectedRoute><InquiryForm /></ProtectedRoute>} />
        <Route path="/inquiry/create" element={<ProtectedRoute><InquiryForm /></ProtectedRoute>} />
        <Route path="/inquiry/success" element={<ProtectedRoute><InquirySuccess /></ProtectedRoute>} />
        <Route path="/inquiries" element={<ProtectedRoute><MyInquiries /></ProtectedRoute>} />
        <Route path="/inquiries/:id" element={<ProtectedRoute><InquiryDetail /></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/referral-history" element={<ProtectedRoute><ReferralHistory /></ProtectedRoute>} />
        <Route path="/shop/dashboard" element={<ProtectedRoute><ShopDashboard /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><CustomerSupport /></ProtectedRoute>} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

export default App;
