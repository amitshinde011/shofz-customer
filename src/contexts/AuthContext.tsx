import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
}

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
}

// Local storage keys
const USER_PROFILE_KEY = 'localconnect_user_profile';
const USER_PROFILE_TIMESTAMP_KEY = 'localconnect_user_profile_timestamp';
const PROFILE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper functions for local storage
const saveUserProfileToStorage = (profile: AuthUser) => {
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(USER_PROFILE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('[AuthContext] Failed to save profile to localStorage:', error);
  }
};

const getUserProfileFromStorage = (userId: string): AuthUser | null => {
  try {
    const cachedProfile = localStorage.getItem(USER_PROFILE_KEY);
    const timestamp = localStorage.getItem(USER_PROFILE_TIMESTAMP_KEY);

    if (!cachedProfile || !timestamp) {
      return null;
    }

    const age = Date.now() - parseInt(timestamp);
    if (age > PROFILE_CACHE_DURATION) {
      clearUserProfileFromStorage();
      return null;
    }

    const profile = JSON.parse(cachedProfile) as AuthUser;

    if (profile.id !== userId) {
      clearUserProfileFromStorage();
      return null;
    }

    return profile;
  } catch (error) {
    clearUserProfileFromStorage();
    return null;
  }
};

const clearUserProfileFromStorage = () => {
  try {
    localStorage.removeItem(USER_PROFILE_KEY);
    localStorage.removeItem(USER_PROFILE_TIMESTAMP_KEY);
  } catch (error) {
    console.error('[AuthContext] Failed to clear profile from localStorage:', error);
  }
};

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  authenticateWithEmail: (email: string, password: string, name?: string) => Promise<any>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<any>;
  requestPasswordReset: (email: string) => Promise<any>;
  updatePassword: (newPassword: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });
  const { toast } = useToast();
  const toastRef = useRef(toast);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const fetchUserProfile = async (userId: string): Promise<AuthUser | null> => {
    try {
      // Check cache first
      const cached = getUserProfileFromStorage(userId);
      if (cached) {
        return cached;
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Check if user has customer role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'customer')
        .eq('is_active', true)
        .single();

      if (!roleData) {
        return null;
      }

      const userProfile: AuthUser = {
        id: data.id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        avatar_url: data.avatar_url,
        is_active: data.is_active
      };

      saveUserProfileToStorage(userProfile);
      return userProfile;
    } catch (error) {
      console.error('[AuthContext] Exception in fetchUserProfile:', error);
      return null;
    }
  };

  // Set up auth listener ONCE (empty dependency array)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[AuthContext] Setting up global auth listener (ONCE)');
    }
    let mounted = true;

    const handleAuthChange = async (event: string, session: Session | null) => {
      if (!mounted) return;

      if (import.meta.env.DEV) {
        console.log('[AuthContext] Auth event:', event, 'Session:', !!session);
      }

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        
        if (mounted) {
          setAuthState({
            user: profile,
            session,
            loading: false,
          });
        }
      } else {
        clearUserProfileFromStorage();
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
          });
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        handleAuthChange('INITIAL_SESSION', session);
      }
    });

    return () => {
      if (import.meta.env.DEV) {
        console.log('[AuthContext] Cleaning up global auth listener');
      }
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // ← EMPTY DEPS = RUNS ONCE

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            name,
            app_type: 'customer' // Identify this is Customer App
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      // Handle "user already registered" in shared database
      if (error?.message?.includes('already registered')) {
        // Verify credentials by signing in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          return { success: false, error: 'This email is already registered. Please sign in instead.' };
        }

        const userId = signInData.user.id;

        // Check if user has customer role in shared user_roles table
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'customer')
          .eq('is_active', true)
          .maybeSingle();

        if (roleData) {
          // User already has customer role
          await supabase.auth.signOut();
          return { 
            success: false, 
            error: 'You already have a customer account. Please sign in instead.' 
          };
        }

        // User exists but doesn't have customer role - add it
        // Ensure user exists in public.users (should already exist from other app)
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (!userData) {
          await supabase.from('users').insert({
            id: userId,
            email: signInData.user.email,
            name: signInData.user.user_metadata?.name || name || signInData.user.email?.split('@')[0] || 'User',
            email_verified: !!signInData.user.email_confirmed_at,
            email_verified_at: signInData.user.email_confirmed_at
          });
        }

        // Add customer role to shared user_roles table
        await supabase.from('user_roles').insert({
          user_id: userId,
          role: 'customer'
        });

        // Create customer profile
        await supabase.from('customer_profiles').insert({
          user_id: userId
        });

        return { success: true, user: signInData.user };
      }

      if (error) {
        console.error('[AuthContext] Sign up error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('[AuthContext] Exception in signUpWithEmail:', error);
      return { success: false, error: error.message || 'Failed to sign up' };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('[AuthContext] Sign in error:', error);
        return { success: false, error: error.message };
      }

      // Verify user has customer role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'customer')
        .eq('is_active', true)
        .single();

      if (!roleData) {
        await supabase.auth.signOut();
        return { success: false, error: 'This app is for customers only. Please use the Shop Owner app.' };
      }

      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('[AuthContext] Exception in signInWithEmail:', error);
      return { success: false, error: error.message || 'Failed to sign in' };
    }
  };

  const updateProfile = async (updates: Partial<AuthUser>) => {
    try {
      if (!authState.user) {
        return { success: false, error: 'No authenticated user' };
      }

      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', authState.user.id)
        .select()
        .single();

      if (error) {
        console.error('[AuthContext] Profile update error:', error);
        return { success: false, error: error.message };
      }

      const updatedProfile: AuthUser = {
        id: data.id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        avatar_url: data.avatar_url,
        is_active: data.is_active
      };

      setAuthState(prev => ({ ...prev, user: updatedProfile }));
      saveUserProfileToStorage(updatedProfile);

      return { success: true };
    } catch (error: any) {
      console.error('[AuthContext] Exception in updateProfile:', error);
      return { success: false, error: error.message || 'Failed to update profile' };
    }
  };

  const authenticateWithEmail = async (email: string, password: string, name?: string) => {
    try {
      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!signInError && signInData.user) {
        // Sign in successful - verify customer role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', signInData.user.id)
          .eq('role', 'customer')
          .eq('is_active', true)
          .single();

        if (!roleData) {
          await supabase.auth.signOut();
          return { success: false, error: 'This app is for customers only. Please use the Shop Owner app.' };
        }

        return { success: true, isNewUser: false, user: signInData.user };
      }

      // Sign in failed - try sign up if error is invalid credentials
      if (signInError?.message?.includes('Invalid login credentials')) {
        const signUpResult = await signUpWithEmail(email, password, name || email.split('@')[0]);
        
        if (signUpResult.success) {
          return { success: true, isNewUser: true, user: signUpResult.user };
        }
        
        return { success: false, error: signUpResult.error };
      }

      // Other sign in error
      console.error('[AuthContext] Sign in error:', signInError);
      return { success: false, error: signInError?.message || 'Authentication failed' };
    } catch (error: any) {
      console.error('[AuthContext] Exception in authenticateWithEmail:', error);
      return { success: false, error: error.message || 'Failed to authenticate' };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error: any) {
      console.error('[AuthContext] Error signing in with Google:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to sign in with Google' 
      };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      clearUserProfileFromStorage();
      return { success: true };
    } catch (error: any) {
      console.error('[AuthContext] Error signing out:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign out'
      };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('[AuthContext] Error requesting password reset:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send reset email' 
      };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('[AuthContext] Error updating password:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update password' 
      };
    }
  };

  const value: AuthContextType = {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    isAuthenticated: !!authState.user && !!authState.session,
    signUpWithEmail,
    signInWithEmail,
    authenticateWithEmail,
    updateProfile,
    signInWithGoogle,
    signOut,
    requestPasswordReset,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
