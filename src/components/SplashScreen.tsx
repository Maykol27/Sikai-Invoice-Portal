
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

export function SplashScreen({ onFinish }: { onFinish?: () => void }) {
    const [show, setShow] = useState(true);
    const [animateOut, setAnimateOut] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimateOut(true);
            setTimeout(() => {
                setShow(false);
                onFinish?.();
            }, 1000);
        }, 3500);

        return () => clearTimeout(timer);
    }, []);

    if (!show) return null;

    return (
        <div className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center bg-[#050508] overflow-hidden",
            animateOut ? "opacity-0 pointer-events-none transition-opacity duration-1000 ease-in-out" : "opacity-100"
        )}>
            {/* --- TECH BACKGROUND --- */}

            {/* Moving Grid Floor */}
            <div className="absolute inset-0 perspective-[1000px] opacity-30">
                <div className="absolute bottom-[-30%] left-[-50%] right-[-50%] h-[100%] bg-[linear-gradient(transparent_0%,_#1a88ff_100%)] rounded-full blur-[100px] opacity-20"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(26,136,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(26,136,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [transform:rotateX(60deg)_translateY(-200px)_scale(3)] animate-[grid-move_20s_linear_infinite]"></div>
            </div>

            {/* Floating Particles/Nodes */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-[#26d8c4] rounded-full animate-pulse"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            opacity: Math.random() * 0.5 + 0.1,
                            animationDuration: `${Math.random() * 3 + 2}s`,
                            boxShadow: '0 0 10px #26d8c4'
                        }}
                    />
                ))}
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center">

                {/* --- LOGO HOLOGRAM CORE --- */}
                <div className="relative w-64 h-64 flex items-center justify-center">
                    {/* Ring 1 - Fast Scan */}
                    <div className="absolute inset-0 border border-[#26d8c4]/30 rounded-full animate-[spin_3s_linear_infinite] border-t-transparent border-l-transparent"></div>

                    {/* Ring 2 - Slow Reverse */}
                    <div className="absolute inset-4 border-[2px] border-[#1a88ff]/20 rounded-full animate-[spin_8s_linear_infinite_reverse] border-b-transparent border-r-transparent"></div>

                    {/* Ring 3 - Pulsing Glow */}
                    <div className="absolute inset-[15%] rounded-full bg-[#1a88ff]/5 animate-pulse shadow-[0_0_50px_rgba(26,216,196,0.1)]"></div>

                    {/* Central Logo */}
                    <div className="relative z-20 w-32 h-32 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-3xl border border-[#26d8c4]/20 shadow-[0_0_30px_rgba(26,136,255,0.2)] animate-in zoom-in-50 duration-1000">
                        <img
                            src="/sikai-logo.png"
                            alt="SIKAI"
                            className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(38,216,196,0.5)] animate-pulse"
                        />
                        {/* Scanline Effect over Logo */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#26d8c4]/10 to-transparent w-full h-[20%] animate-[scan-vertical_2s_linear_infinite] rounded-3xl pointer-events-none"></div>
                    </div>

                    {/* Orbiting Decor */}
                    <div className="absolute w-full h-full animate-[spin_12s_linear_infinite]">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#26d8c4] rounded-full shadow-[0_0_10px_#26d8c4]"></div>
                    </div>
                </div>

                {/* --- TYPOGRAPHY --- */}
                <div className="mt-12 text-center relative">
                    <h1 className="text-6xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-[#26d8c4] to-[#1a88ff] animate-in slide-in-from-bottom-5 fade-in duration-1000 delay-300 drop-shadow-2xl font-headline">
                        SIKAI
                        <span className="text-[#26d8c4] animate-pulse">.</span>
                        <span className="text-[#1a88ff]">CX</span>
                    </h1>

                    <div className="h-px w-0 bg-gradient-to-r from-transparent via-[#26d8c4] to-transparent mx-auto mt-4 animate-[expand-width_1.5s_ease-out_forwards_0.8s]"></div>

                    <p className="mt-4 text-xs md:text-sm font-code tracking-[0.5em] text-[#1a88ff] uppercase animate-in slide-in-from-bottom-5 fade-in duration-1000 delay-700">
                        Inteligencia Artificial Financiera
                    </p>
                </div>
            </div>

            {/* Custom Animations Style Injection */}
            <style>{`
                @keyframes grid-move {
                    0% { transform: perspective(500px) rotateX(60deg) translateY(0) scale(3); }
                    100% { transform: perspective(500px) rotateX(60deg) translateY(40px) scale(3); }
                }
                @keyframes scan-vertical {
                    0% { top: -20%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 120%; opacity: 0; }
                }
                @keyframes expand-width {
                    0% { width: 0; opacity: 0; }
                    100% { width: 200px; opacity: 1; }
                }
            `}</style>
        </div>
    );
}
