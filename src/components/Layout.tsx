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
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-sikai-primary to-sikai-cyan flex items-center justify-center text-white font-bold text-xs shadow-[0_0_10px_rgba(26,136,255,0.5)]">AI</div>
                        <div className="flex flex-col leading-tight">
                            <span className="font-headline font-bold text-lg tracking-tight text-white group-hover:text-sikai-cyan transition-colors">SIKAI</span>
                            <span className="font-headline text-xs text-sikai-cyan font-medium tracking-widest">CONSULTING</span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-6">
                        <nav className="hidden md:flex gap-6 text-sm font-medium">
                            <Link to="/" className="text-gray-300 hover:text-white transition-colors hover:text-sikai-cyan">Escanear</Link>
                            <Link to="/history" className="text-gray-300 hover:text-white transition-colors hover:text-sikai-cyan">Historial</Link>
                            <Link to="/pricing" className="text-gray-300 hover:text-white transition-colors hover:text-sikai-cyan">Precios</Link>
                        </nav>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-code text-sikai-cyan border border-sikai-cyan/30 px-2 py-1 rounded bg-sikai-cyan/10 shadow-[0_0_10px_rgba(38,216,196,0.2)]">PLAN CORPORATIVO</span>
                            <div className="w-8 h-8 rounded-full bg-sikai-card border border-white/10 relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-sikai-primary/20 to-sikai-cyan/20 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow container mx-auto px-6 py-12">
                {children}
            </main>
        </div>
    );
}
