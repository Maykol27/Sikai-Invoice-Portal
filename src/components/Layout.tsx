import React from 'react';
import { Link } from 'react-router-dom';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="font-body min-h-screen flex flex-col bg-sikai-bg selection:bg-sikai-accent selection:text-white text-white">
            <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center space-x-2 group">
                        {/* Placeholder Logo Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-sikai-accent group-hover:text-sikai-secondary transition-colors">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                            <line x1="9" x2="9.01" y1="9" y2="9"></line>
                            <line x1="15" x2="15.01" y1="9" y2="9"></line>
                        </svg>
                        <div>
                            <span className="font-bold text-xl font-headline text-sikai-accent group-hover:text-sikai-secondary transition-colors">SIKAI</span>
                            <span className="font-semibold text-xl font-headline text-white group-hover:text-sikai-secondary transition-colors ml-1">Consulting</span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-6">
                        <NavigationItems />
                    </div>
                </div>
            </header>

            <main className="flex-grow container mx-auto px-6 py-12">
                {children}
            </main>
        </div>
    );
}

import { useAuth } from '../lib/auth';
import { LogOut, User } from 'lucide-react';

function NavigationItems() {
    const { user, signOut } = useAuth();

    // If we are on the login page, we might want to hide these? 
    // Ideally, for simplicity, if no user, show nothing or Login button.
    // But since the entire app is protected by default, we only land here if logged in OR if we allow public access.
    // The user issue "LA APP NO TIENE EL LOGIN AGREGALO" implies maybe they want a way to logout or see user status.

    if (!user) {
        return null; // Or return a Login Link if you have public pages
    }

    return (
        <>
            <nav className="hidden md:flex gap-6 text-sm font-medium">
                <Link to="/dashboard" className="text-gray-300 hover:text-white transition-colors">Dashboard</Link>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors">Escanear</Link>
                <Link to="/history" className="text-gray-300 hover:text-white transition-colors">Historial</Link>
                <Link to="/pricing" className="text-gray-300 hover:text-white transition-colors">Precios</Link>
            </nav>
            <div className="flex items-center gap-4">
                <span className="hidden md:inline-block text-xs font-code text-sikai-accent border border-sikai-accent/30 px-2 py-1 rounded bg-sikai-accent/10">PLAN CORPORATIVO</span>

                <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                    <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400">
                        <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col leading-tight mr-2">
                        <span className="hidden md:inline-block text-xs text-white font-bold truncate max-w-[100px]">{user.email?.split('@')[0]}</span>
                    </div>

                    <button
                        onClick={() => signOut()}
                        className="text-gray-400 hover:text-red-400 transition-colors p-1"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </>
    );
}

