import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
    LayoutDashboard,
    History,
    CreditCard,
    ScanLine,
    LogOut,
    User,
    Menu,
    ChevronLeft,
    ChevronRight,
    X,
    Sun,
    Moon,
    Coins
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="flex h-screen bg-sikai-bg text-sikai-text overflow-hidden font-body selection:bg-sikai-accent selection:text-white transition-colors duration-300">
            <Sidebar />
            <MobileNav />

            <main className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-sikai-border scrollbar-track-transparent">
                <div className="container mx-auto px-4 py-6 md:px-8 md:py-10 pb-24 md:pb-10 max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    );
}

function Sidebar() {
    const { user, signOut, credits } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // Init theme
        const savedTheme = localStorage.getItem('theme');
        const root = document.documentElement;

        if (savedTheme === 'light') {
            setIsDark(false);
            root.classList.remove('dark');
            root.setAttribute('data-theme', 'light');
        } else {
            setIsDark(true);
            root.classList.add('dark');
            root.setAttribute('data-theme', 'dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        const root = document.documentElement;
        if (newTheme) {
            root.classList.add('dark');
            root.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            root.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    };

    const menuItems = [
        { icon: ScanLine, label: 'Escanear', path: '/' },
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: History, label: 'Historial', path: '/history' },
        { icon: CreditCard, label: 'Precios', path: '/pricing' },
    ];

    return (
        <aside
            className={twMerge(
                "hidden md:flex flex-col bg-white dark:bg-black/20 backdrop-blur-md border-r border-gray-200 dark:border-sikai-border h-full transition-all duration-300 relative",
                collapsed ? "w-[80px]" : "w-[280px]"
            )}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-8 w-6 h-6 bg-sikai-accent text-white dark:text-black rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50 focus:outline-none"
            >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Logo Area */}
            <div className={twMerge(
                "h-24 flex items-center border-b border-gray-200 dark:border-sikai-border transition-all duration-300",
                collapsed ? "justify-center px-0" : "justify-start px-6"
            )}>
                <Link to="/" className="flex items-center gap-3 group">
                    <img
                        src="/sikai-logo.png"
                        alt="Sikai"
                        className={twMerge(
                            "object-contain rounded-xl border border-gray-200 dark:border-sikai-accent/30 group-hover:border-sikai-accent shadow-[0_0_15px_rgba(30,215,96,0.1)] transition-all",
                            collapsed ? "h-10 w-10" : "h-10 w-10"
                        )}
                    />
                    <div className={twMerge(
                        "flex flex-col transition-all duration-300 overflow-hidden whitespace-nowrap",
                        collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    )}>
                        <span className="font-headline font-bold text-lg tracking-wide text-gray-900 dark:text-white group-hover:text-sikai-accent transition-colors">SIKAI</span>
                        <span className="text-[10px] text-gray-500 font-code tracking-wider uppercase">Consulting</span>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={twMerge(
                                "flex items-center py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                                collapsed ? "justify-center px-2 gap-0" : "px-3 gap-4",
                                isActive
                                    ? "bg-sikai-accent/10 text-sikai-accent shadow-sm"
                                    : "text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-black dark:hover:text-white"
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            {isActive && (
                                <div className={twMerge(
                                    "absolute bg-sikai-accent rounded-r-full shadow-[0_0_10px_#1ad8c4] transition-all duration-300",
                                    collapsed ? "left-1/2 -translate-x-1/2 bottom-1 w-1 h-1 rounded-full top-auto" : "left-0 top-1/2 -translate-y-1/2 w-1 h-8"
                                )} />
                            )}
                            <Icon className={twMerge(
                                "shrink-0 transition-transform group-hover:scale-110",
                                isActive && "animate-pulse-slow", // kept pulse
                                "w-6 h-6"
                            )} />
                            <span className={twMerge(
                                "font-medium text-sm tracking-wide transition-all duration-300 overflow-hidden whitespace-nowrap",
                                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}


                {/* Credits Display */}
                <div className="mt-auto mb-2">
                    <div className={twMerge(
                        "bg-white dark:bg-black/40 rounded-2xl border border-sikai-border mx-auto transition-all duration-300 overflow-hidden relative group shadow-sm",
                        collapsed ? "w-12 py-3 px-0 flex flex-col items-center" : "w-full p-4"
                    )}>
                        {/* Shine effect */}
                        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-sikai-accent/5 blur-xl rounded-full group-hover:bg-sikai-accent/10 transition-colors"></div>

                        {collapsed ? (
                            // Collapsed View
                            <div className="flex flex-col items-center gap-1 group cursor-default" title={`Créditos Disponibles: ${credits ?? 0}`}>
                                <Coins className="w-5 h-5 text-yellow-500 dark:text-yellow-400 group-hover:rotate-12 transition-transform" />
                                <span className="text-[10px] font-bold text-gray-900 dark:text-white font-mono">{credits ?? 0}</span>
                            </div>
                        ) : (
                            // Expanded View
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <p className="text-xs text-gray-500 font-medium mb-1">Créditos Disp.</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white font-mono flex items-center gap-2">
                                        {credits ?? 0}
                                        <span className="text-xs font-normal text-gray-400">/ mes</span>
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-yellow-400/10 flex items-center justify-center border border-yellow-400/20">
                                    <Coins className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                </div>
                            </div>
                        )}

                        {!collapsed && (
                            <Link to="/pricing" className="block mt-3 text-center text-xs text-sikai-accent hover:text-sikai-text transition-colors bg-sikai-accent/5 rounded-lg py-1.5 hover:bg-sikai-accent/10">
                                Recargar
                            </Link>
                        )}
                    </div>
                </div>

                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className={twMerge(
                        "flex items-center justify-center transition-all duration-300 rounded-xl mb-2 group",
                        collapsed ? "w-full py-3 hover:bg-gray-100 dark:hover:bg-white/5" : "px-4 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 mx-0 gap-3"
                    )}
                    title={isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                >
                    <div className={twMerge("transition-transform duration-500 rotate-0", isDark ? "rotate-0" : "rotate-180")}>
                        {isDark ? (
                            <Moon className="w-5 h-5 text-sikai-accent" />
                        ) : (
                            <Sun className="w-5 h-5 text-yellow-500 dark:text-yellow-400 group-hover:scale-110" />
                        )}
                    </div>
                    {!collapsed && (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white">
                            {isDark ? 'Modo Oscuro' : 'Modo Claro'}
                        </span>
                    )}
                </button>
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-sikai-border bg-black/5 dark:bg-black/10">
                <div className={twMerge(
                    "flex items-center gap-3 p-2 rounded-xl bg-white/50 dark:bg-white/5 border border-sikai-border hover:border-sikai-accent/30 transition-colors group cursor-pointer",
                    collapsed ? "justify-center" : ""
                )}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sikai-secondary to-gray-800 flex items-center justify-center shrink-0 border border-sikai-border relative">
                        <User className="w-5 h-5 text-white" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#1a1d24]"></div>
                    </div>

                    <div className={twMerge(
                        "flex flex-col flex-1 overflow-hidden transition-all duration-300",
                        collapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
                    )}>
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[120px]">
                            {user?.email?.split('@')[0]}
                        </span>
                        <span className="text-[10px] text-gray-500">Online</span>
                    </div>

                    {!collapsed && (
                        <button
                            onClick={() => signOut()}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors ml-auto"
                            title="Cerrar Sesión"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    )}
                </div>
                {/* Logout executed when collapsed via separate button below profile to keep targets clear */}
                {collapsed && (
                    <button
                        onClick={() => signOut()}
                        className="mt-2 w-full flex items-center justify-center p-2 text-gray-400 hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                )}
            </div>
        </aside>
    );
}

function MobileNav() {
    const location = useLocation();
    const { signOut } = useAuth();

    // Using a different set for mobile if needed, but same here
    const menuItems = [
        { icon: LayoutDashboard, label: 'Dash', path: '/dashboard' },
        { icon: ScanLine, label: 'Escanear', path: '/' },
        { icon: History, label: 'Historial', path: '/history' },
        { icon: CreditCard, label: 'Precios', path: '/pricing' },
    ];

    return (
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
            <nav className="bg-white/90 dark:bg-[#1a1d24]/90 backdrop-blur-xl border border-sikai-border rounded-2xl shadow-2xl shadow-black/50 px-6 py-4 flex items-center justify-between">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={twMerge(
                                "flex flex-col items-center gap-1 transition-all duration-300 relative",
                                isActive ? "text-sikai-accent -translate-y-2" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            )}
                        >
                            <div className={twMerge(
                                "p-2 rounded-full transition-all",
                                isActive ? "bg-sikai-accent/20 shadow-[0_0_15px_rgba(38,216,196,0.4)]" : "bg-transparent"
                            )}>
                                <Icon className="w-6 h-6" />
                            </div>
                            {isActive && (
                                <span className="absolute -bottom-4 text-[10px] font-bold tracking-wider animate-in fade-in slide-in-from-bottom-2">
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}

                <button
                    onClick={() => signOut()}
                    className="flex flex-col items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
                >
                    <div className="p-2">
                        <LogOut className="w-6 h-6" />
                    </div>
                </button>
            </nav>
        </div>
    );
}
