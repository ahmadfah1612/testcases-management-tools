'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';
import { toast } from 'sonner';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, invitationCode: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (accessToken: string, newPassword: string) => Promise<{ message: string }>;
}

const AUTH_USER_KEY = 'app_user';

function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedUser(user: User | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Wrapper that keeps localStorage in sync
  const setUser = (u: User | null) => {
    setUserState(u);
    setCachedUser(u);
  };

  // Restore cached user on client mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const cached = getCachedUser();
    if (cached) setUserState(cached);
  }, []);

  const router = useRouter();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  
  const inactivityTimeoutHours = parseInt(
    process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_HOURS || '2'
  );
  const inactivityTimeoutMs = inactivityTimeoutHours * 60 * 60 * 1000;
  const warningTimeoutMs = Math.min(5 * 60 * 1000, inactivityTimeoutMs - 60 * 1000);

  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    warningTimerRef.current = setTimeout(() => {
      if (user) {
        toast.warning(
          `You will be logged out in ${Math.round((inactivityTimeoutMs - warningTimeoutMs) / 60000)} minutes due to inactivity`,
          { duration: 60000 }
        );
      }
    }, warningTimeoutMs);

    inactivityTimerRef.current = setTimeout(() => {
      if (user) {
        toast.error('You have been logged out due to inactivity');
        logout();
      }
    }, inactivityTimeoutMs);
  };

  useEffect(() => {
    const handleActivity = () => {
      resetInactivityTimer();
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [user]);

  const fetchUser = async (authId: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
      } else if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Sequential init — getSession then fetchUser, guaranteed to set loading=false
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          await fetchUser(session.user.id);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for subsequent auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return; // Already handled by initAuth
      if (!mounted) return;

      if (session?.user) {
        await fetchUser(session.user.id);
        resetInactivityTimer();
      } else {
        setUser(null);
        setLoading(false);
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      console.log('Login attempt for username:', username);
      
      // Clear any existing session first (prevents stale session issues)
      await supabase.auth.signOut();
      console.log('Cleared any existing session');
      
      // First, find the user by username to get the email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, username')
        .ilike('username', username)
        .single();

      console.log('User lookup result:', { userData, userError });

      if (userError || !userData) {
        console.error('User lookup failed:', userError);
        throw new Error('Invalid credentials');
      }

      console.log('Found user email:', userData.email);

      // Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password,
      });

      console.log('Supabase auth result:', { success: !!data.user, error: error?.message });

      if (error) {
        console.error('Supabase auth error:', error);
        throw new Error(error.message || 'Invalid credentials');
      }

      if (data.user) {
        await fetchUser(data.user.id);
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string, invitationCode: string) => {
    try {
      // Call backend API for registration (which validates invitation code)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password, invitationCode }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.token) {
        // Establish a Supabase session so subsequent API calls include the Authorization header.
        // The backend uses the service role key which auto-confirms new users, so sign-in
        // succeeds immediately after registration.
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error('Auto-login after registration failed:', signInError);
        }

        setUser(data.user);
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/forgot-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw new Error('Failed to send reset email');
    }
  };

  const resetPassword = async (accessToken: string, newPassword: string) => {
    try {
      // Create a new Supabase client with the recovery token
      // This is the correct way to use a recovery token
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      
      const supabaseWithToken = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      });

      // Update password using the authenticated client
      const { data, error } = await supabaseWithToken.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Supabase update password error:', error);
        throw new Error(error.message || 'Failed to reset password');
      }

      return { message: 'Password has been reset successfully' };
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, forgotPassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
