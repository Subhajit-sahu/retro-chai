import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useAdminAuth() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAdminStatus = useCallback(async (currentUser) => {
    if (!currentUser || !isSupabaseConfigured || !supabase) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      // Direct query to admin_users table (enforced by RLS)
      const { data, error: adminErr } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (adminErr) {
        console.error('Supabase admin_users query error:', adminErr);
        setIsAdmin(false);
      } else if (data && data.user_id === currentUser.id) {
        console.log('Admin access granted for:', currentUser.email);
        setIsAdmin(true);
      } else {
        console.log('User is not in admin_users allowlist:', currentUser.id);
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('Admin status check exception:', err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      if (currentUser) {
        checkAdminStatus(currentUser);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user || null;
        if (currentUser) {
          setLoading(true);
          setUser(currentUser);
          await checkAdminStatus(currentUser);
        } else {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [checkAdminStatus]);

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Please check your environment variables.');
    }
    setError(null);
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (signInErr) {
      setError(signInErr.message);
      throw signInErr;
    }
    return data;
  };

  const signInWithOtp = async (email) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Please check your environment variables.');
    }
    setError(null);
    const { data, error: otpErr } = await supabase.auth.signInWithOtp({
      email: email.trim()
    });
    if (otpErr) {
      setError(otpErr.message);
      throw otpErr;
    }
    return data;
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsAdmin(false);
  };

  return {
    user,
    isAdmin,
    loading,
    error,
    signIn,
    signInWithOtp,
    signOut,
    checkAdminStatus: () => user && checkAdminStatus(user)
  };
}
