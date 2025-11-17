import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { ReferralCodeSettings } from "@/components/profile/ReferralCodeSettings";
import { CustomerReferralCard } from "@/components/profile/CustomerReferralCard";
import { UpiIdSettings } from "@/components/profile/UpiIdSettings";
import {
  User,
  MapPin,
  Phone,
  Mail,
  Bell,
  MessageSquare,
  Heart,
  ShoppingBag,
  Settings,
  HelpCircle,
  Shield,
  LogOut,
  Edit,
  ChevronRight,
  CheckCircle2,
  Save,
  X,
  ArrowLeft,
  Volume2,
  Database
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useInquiryStats } from "@/hooks/useInquiries";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Capacitor } from '@capacitor/core';
import { getStorageInfo, repairStorage, StorageInfo } from '@/lib/storageHealth';
import { 
  isSoundEnabled, 
  setSoundEnabled,
  isInquirySoundEnabled,
  setInquirySoundEnabled,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  isPaymentSoundEnabled,
  setPaymentSoundEnabled
} from '@/lib/soundNotifications';

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, updateProfile, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data: inquiryStats } = useInquiryStats(user?.id || '');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || ""
  });
  
  // Sound settings state
  const [soundSettings, setSoundSettings] = useState({
    support: isSoundEnabled(),
    inquiry: isInquirySoundEnabled(),
    notification: isNotificationSoundEnabled(),
    payment: isPaymentSoundEnabled(),
  });

  // Storage info state
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  // Sync form data when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || ""
      });
    }
  }, [user]);

  // Load storage info
  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    const info = await getStorageInfo();
    setStorageInfo(info);
  };

  const handleClearCache = async () => {
    if (!confirm('Clear all app data? You will need to sign in again.')) return;
    
    const success = await repairStorage();
    
    if (success) {
      toast({ title: '✅ Cache cleared', description: 'App will reload...' });
      setTimeout(() => window.location.reload(), 1500);
    } else {
      toast({ 
        title: '❌ Clear failed', 
        description: 'Please clear site data manually in browser settings',
        variant: 'destructive'
      });
    }
  };

  const handleCheckUpdates = async () => {
    if (isNative) {
      toast({ title: 'Updates', description: 'Native app updates via app store' });
      return;
    }
    
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        toast({ title: '🔍 Checking for updates...' });
      } else {
        toast({ title: 'No service worker registered' });
      }
    }
  };

  const handleBack = () => {
    navigate('/');
  };
  
  const handleToggleSound = (category: string, enabled: boolean) => {
    setSoundSettings(prev => ({ ...prev, [category]: enabled }));
    
    switch (category) {
      case 'support':
        setSoundEnabled(enabled);
        break;
      case 'inquiry':
        setInquirySoundEnabled(enabled);
        break;
      case 'notification':
        setNotificationSoundEnabled(enabled);
        break;
      case 'payment':
        setPaymentSoundEnabled(enabled);
        break;
    }
    
    toast({
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Sounds ${enabled ? 'Enabled' : 'Disabled'}`,
    });
  };

  // Real-time subscription for inquiry count updates
  useEffect(() => {
    if (!user?.id) return;

    console.log('[Profile] Setting up real-time inquiry count subscription');
    
    const channel = supabase
      .channel('profile-inquiries-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inquiries',
          filter: `customer_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Profile] Inquiry change detected:', payload);
          // Invalidate inquiry stats to refetch count
          queryClient.invalidateQueries({ queryKey: ['inquiry-stats', user.id] });
        }
      )
      .subscribe();

    return () => {
      console.log('[Profile] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  console.log('[Profile] Component render - user:', !!user, 'isEditing:', isEditing);
  console.log('[Profile] User data:', user);
  console.log('[Profile] Form data:', formData);
  console.log('[Profile] updateProfile function:', typeof updateProfile);

  const handleSaveProfile = async () => {
    console.log('[Profile] Save button clicked - starting profile update');
    console.log('[Profile] Current user:', user);
    console.log('[Profile] Form data to save:', formData);

    // Validate required fields
    if (!formData.name || formData.name.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Name is required",
        variant: "destructive"
      });
      return;
    }

    console.log('[Profile] Validation passed, calling updateProfile');
    try {
      const result = await updateProfile(formData);
      console.log('[Profile] Update result:', result);

      if (result.success) {
        setIsEditing(false);
        toast({
          title: "Profile updated",
          description: "Your profile information has been saved successfully.",
        });
      } else {
        console.error('[Profile] Update failed with error:', result.error);
        toast({
          title: "Update failed",
          description: result.error || "Failed to update profile",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[Profile] Exception during profile update:', error);
      toast({
        title: "Update failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const menuItems = [
    {
      title: "My Activities",
      items: [
        {
          icon: MessageSquare,
          label: "My Inquiries",
          description: "View all your product inquiries",
          action: () => navigate("/inquiries"),
          badge: inquiryStats?.data?.total ? inquiryStats.data.total.toString() : undefined
        },
        {
          icon: Heart,
          label: "Favorite Shops",
          description: "Your saved shops",
          action: () => navigate("/favorites")
        },
      ]
    },
    {
      title: "Settings & Support",
      items: [
        {
          icon: Bell,
          label: "Notifications",
          description: "Manage notification preferences",
          action: () => toast({ title: "Coming soon", description: "Notification settings will be available soon" })
        },
        {
          icon: Settings,
          label: "Account Settings",
          description: "Privacy and security settings",
          action: () => toast({ title: "Coming soon", description: "Account settings will be available soon" })
        },
        {
          icon: HelpCircle,
          label: "Help & Support",
          description: "Get help or contact support",
          action: () => navigate("/support")
        },
        {
          icon: Shield,
          label: "Terms & Privacy",
          description: "Legal information and policies",
          action: () => navigate("/privacy-policy")
        },
      ]
    }
  ];

  const handleLogout = async () => {
    try {
      const result = await signOut();
      if (result.success) {
        navigate('/auth');
        toast({ title: "Signed out", description: "You have been signed out successfully" });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to sign out",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-24 lg:pb-6">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6">
          {/* Mobile Header */}
          <div className="lg:hidden bg-card border-b border-border px-4 py-4 sticky top-0 z-50 backdrop-blur-sm bg-card/95">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="shrink-0 -ml-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Profile</h1>
            </div>
          </div>

          {/* Sidebar - Desktop Navigation */}
          <div className="hidden lg:block lg:col-span-3 border-r border-border">
            <div className="sticky top-0 p-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mb-4 -ml-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold text-foreground mb-6">Your Account</h1>

              <nav className="space-y-1">
                {menuItems.map((section, sectionIdx) => (
                  <div key={sectionIdx} className="mb-6">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                      {section.title}
                    </h3>
                    {section.items.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={item.action}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                      >
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                ))}

                <Separator className="my-4" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 py-4 sm:py-6 space-y-4 sm:space-y-5 md:space-y-6">
            {/* Profile Header Card */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                {!isEditing ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 sm:gap-6">
                      <div className="relative">
                        <Avatar className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 border-2 border-border">
                          <AvatarImage src={user?.avatar_url} alt={user?.name || 'User'} />
                          <AvatarFallback className="text-xl sm:text-2xl">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                              {user?.name || 'Anonymous User'}
                            </h2>
                            {user?.email && (
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                            className="h-9 sm:h-10 shrink-0"
                          >
                            <Edit className="w-4 h-4 sm:w-3.5 sm:h-3.5 sm:mr-1.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {user?.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-foreground truncate">
                                {user.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground">Edit Profile</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({
                            name: user?.name || "",
                            email: user?.email || ""
                          });
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">
                          Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => {
                            console.log('[Profile] Name changed to:', e.target.value);
                            setFormData(prev => ({ ...prev, name: e.target.value }));
                          }}
                          placeholder="Enter your name"
                          className="h-10"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">
                          Email <span className="text-muted-foreground text-xs">(Optional)</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => {
                            console.log('[Profile] Email changed to:', e.target.value);
                            setFormData(prev => ({ ...prev, email: e.target.value }));
                          }}
                          placeholder="Enter your email"
                          className="h-10"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="flex gap-3">
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          console.log('[Profile] Save button clicked');
                          handleSaveProfile();
                        }}
                        className="flex-1 h-10"
                        type="button"
                      >
                        <Save className="w-4 h-4 mr-1.5" />
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsEditing(false);
                          setFormData({
                            name: user?.name || "",
                            email: user?.email || ""
                          });
                        }}
                        className="flex-1 h-10"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Referral Section */}
            {!isEditing && <CustomerReferralCard />}

            {/* UPI ID Settings */}
            {!isEditing && <UpiIdSettings />}

            {/* Shop Referral Code Section */}
            {!isEditing && <ReferralCodeSettings />}
            
            {/* Sound Notification Settings */}
            {!isEditing && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-primary" />
                    <CardTitle>🔊 Sound Notifications</CardTitle>
                  </div>
                  <CardDescription>Control sound alerts for different activities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Support Messages</h3>
                      <p className="text-sm text-muted-foreground">Customer support chat sounds</p>
                    </div>
                    <Switch
                      checked={soundSettings.support}
                      onCheckedChange={(enabled) => handleToggleSound('support', enabled)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Inquiry Messages</h3>
                      <p className="text-sm text-muted-foreground">Shop responses and quotes</p>
                    </div>
                    <Switch
                      checked={soundSettings.inquiry}
                      onCheckedChange={(enabled) => handleToggleSound('inquiry', enabled)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">General Notifications</h3>
                      <p className="text-sm text-muted-foreground">App notifications and updates</p>
                    </div>
                    <Switch
                      checked={soundSettings.notification}
                      onCheckedChange={(enabled) => handleToggleSound('notification', enabled)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Payment Alerts</h3>
                      <p className="text-sm text-muted-foreground">Payment requests and confirmations</p>
                    </div>
                    <Switch
                      checked={soundSettings.payment}
                      onCheckedChange={(enabled) => handleToggleSound('payment', enabled)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Storage & Cache Management */}
            {!isEditing && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    <CardTitle>🗄️ Storage & Cache</CardTitle>
                  </div>
                  <CardDescription>
                    Manage app data and cache (Platform: {platform})
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {storageInfo && (
                    <div className="text-sm space-y-1 p-3 bg-muted rounded-lg">
                      <p>📊 Storage: {storageInfo.itemCount} items, {storageInfo.estimatedSizeKB} KB</p>
                      <p>📦 Caches: {storageInfo.cacheCount}</p>
                      <p>🏥 Health: {storageInfo.isHealthy ? '✅ Good' : '⚠️ Issues detected'}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Clear App Cache</h3>
                      <p className="text-sm text-muted-foreground">
                        Fix loading issues by clearing all cached data
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleClearCache}>
                      Clear
                    </Button>
                  </div>
                  
                  {!isNative && (
                    <>
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Check for Updates</h3>
                          <p className="text-sm text-muted-foreground">
                            Manually check for app updates
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleCheckUpdates}>
                          Check
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Mobile Menu Sections */}
            {!isEditing && (
              <div className="lg:hidden space-y-4">
                {menuItems.map((section, sectionIdx) => (
                  <Card key={sectionIdx}>
                    <CardContent className="p-0">
                      <div className="px-4 pt-4 pb-2">
                        <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                      </div>

                      <div className="divide-y divide-border">
                        {section.items.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={item.action}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-muted/50 transition-colors"
                          >
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-muted rounded-full flex items-center justify-center shrink-0">
                              <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm sm:text-base text-foreground truncate">
                                  {item.label}
                                </h4>
                                {item.badge && (
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                                {item.description}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Logout Button */}
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <Button
                      variant="destructive"
                      className="w-full h-10"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-1.5" />
                      Sign Out
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}