
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';

export function SplashScreen({ onFinish }: { onFinish?: () => void }) {
    const [show, setShow] = useState(true);
    const [animateOut, setAnimateOut] = useState(false);

    useEffect(() => {
        // Enforce a minimum display time for branding impact
        const timer = setTimeout(() => {
            setAnimateOut(true);
            setTimeout(() => {
                setShow(false);
                onFinish?.();
            }, 800); // Wait for fade-out animation
        }, 3000); // Increased to 3 seconds for better visibility

        return () => clearTimeout(timer);
    }, []); // Run once on mount

    if (!show) return null;

    return (
        <div className={cn(
            "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-sikai-bg transition-opacity duration-800",
            animateOut ? "opacity-0 pointer-events-none" : "opacity-100"
        )}>
            <div className="relative flex flex-col items-center">
                {/* Glowing Background Effect */}
                <div className="absolute inset-0 bg-sikai-accent/20 blur-[100px] rounded-full animate-pulse-slow"></div>

                {/* Logo Container with 3D-like animation */}
                <div className="relative z-10 w-32 h-32 md:w-48 md:h-48 mb-8 animate-in zoom-in-50 duration-1000">
                    <div className="absolute inset-0 border-2 border-sikai-accent/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
                    <div className="absolute inset-2 border border-sikai-primary/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>

                    <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-sm rounded-full shadow-[0_0_50px_rgba(38,216,196,0.3)] overflow-hidden">
                        <img
                            src="/sikai-logo.png"
                            alt="SIKA CX"
                            className="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse"
                        />
                    </div>
                </div>

                {/* Text Animation */}
                <h1 className="text-4xl md:text-5xl font-headline font-bold text-transparent bg-clip-text bg-gradient-to-r from-sikai-primary to-sikai-accent tracking-widest animate-in slide-in-from-bottom-5 fade-in duration-1000 delay-300">
                    SIKAI
                </h1>
                <p className="mt-2 text-sm md:text-base text-gray-400 font-code tracking-[0.3em] uppercase animate-in slide-in-from-bottom-5 fade-in duration-1000 delay-500">
                    Consulting
                </p>

                {/* Optional Loader for functional indication */}
                <div className="mt-12 absolute bottom-20">
                    <Loader2 className="w-6 h-6 text-sikai-accent/50 animate-spin" />
                </div>
            </div>
        </div>
    );
}
