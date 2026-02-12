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
    const [loading, setLoading] = useState(true);
    const [credits, setCredits] = useState<number | null>(null);

    const fetchCredits = async (userId: string) => {
        const { data, error } = await supabase
            .from('users_credits')
            .select('credits')
            .eq('user_id', userId)
            .single();

        if (data) {
            setCredits(data.credits);
        } else {
            // Handle case where row doesn't exist yet (signup race condition or error)
            // Retry or default to 0? Default null/0.
            console.error("Error fetching credits or no row found:", error);
            setCredits(0);
        }
    };

    useEffect(() => {
        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                await fetchCredits(session.user.id);
            }
            setLoading(false);
        };

        initSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                await fetchCredits(session.user.id);
            } else {
                setCredits(null);
            }
            setLoading(false);
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
