import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    credits: number | null;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true); // Global auth loading state
    const [credits, setCredits] = useState<number | null>(null);

    const fetchCredits = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('users_credits')
                .select('credits')
                .eq('user_id', userId)
                .maybeSingle();

            if (!error && data) {
                setCredits(data.credits);
            } else {
                setCredits(0);
            }
        } catch {
            setCredits(0);
        }
    };

    useEffect(() => {
        let mounted = true;

        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (mounted) {
                    setSession(session);
                    setUser(session?.user ?? null);

                    if (session?.user) {
                        // Don't await credits here to unblock UI faster,
                        // or await it but ensure we set loading false after.
                        fetchCredits(session.user.id).catch(() => setCredits(0));
                    }
                }
            } catch (err) {
                console.error("Auth init error", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Cast event to string to avoid TS error if types are outdated
            const eventName = event as string;

            // If this listener fires immediately after initSession, prevent double loading flicker
            // but usually strictly needed for SIGN_IN/SIGN_OUT events
            if (eventName === 'TOKEN_REFRESH_ERRORED') {
                console.warn('Token refresh failed, forcing sign out');
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
                setCredits(null);
                setLoading(false);
                return;
            }

            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    fetchCredits(session.user.id).catch(() => setCredits(0));
                } else {
                    setCredits(null);
                }
                setLoading(false);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Real-time credits update
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('credits-update')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users_credits',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    if (payload.new && 'credits' in payload.new) {
                        setCredits(payload.new.credits as number);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);


    const signIn = async (email: string, password: string) => {
        return supabase.auth.signInWithPassword({
            email: email,
            password: password
        }) as Promise<{ error: any }>;
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setCredits(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, credits, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
