
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
            "fixed inset-0 z-[100] flex items-center justify-center bg-[#000205] overflow-hidden perspective-[2000px]",
            animateOut ? "opacity-0 pointer-events-none transition-opacity duration-1000 ease-in-out" : "opacity-100"
        )}>
            {/* --- IMMERSIVE BACKGROUND --- */}

            {/* Deep Space Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1d29_0%,_#000000_100%)]"></div>

            {/* Cyber Tunnel Effect */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="absolute w-[200vw] h-[200vh] border-[1px] border-[#1a88ff]/10 rounded-full animate-[tunnel-zoom_4s_linear_infinite] [animation-delay:0s]"></div>
                <div className="absolute w-[200vw] h-[200vh] border-[1px] border-[#1a88ff]/10 rounded-full animate-[tunnel-zoom_4s_linear_infinite] [animation-delay:1s]"></div>
                <div className="absolute w-[200vw] h-[200vh] border-[1px] border-[#1a88ff]/10 rounded-full animate-[tunnel-zoom_4s_linear_infinite] [animation-delay:2s]"></div>
                <div className="absolute w-[200vw] h-[200vh] border-[1px] border-[#1a88ff]/10 rounded-full animate-[tunnel-zoom_4s_linear_infinite] [animation-delay:3s]"></div>
            </div>

            {/* Floating Data Matrix */}
            <div className="absolute inset-0 opacity-40">
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(0deg,transparent_24%,rgba(26,136,255,0.1)_25%,rgba(26,136,255,0.1)_26%,transparent_27%,transparent_74%,rgba(26,136,255,0.1)_75%,rgba(26,136,255,0.1)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(26,136,255,0.1)_25%,rgba(26,136,255,0.1)_26%,transparent_27%,transparent_74%,rgba(26,136,255,0.1)_75%,rgba(26,136,255,0.1)_76%,transparent_77%,transparent)] bg-[size:50px_50px] animate-[pan-grid_20s_linear_infinite]"></div>
            </div>

            {/* Random glowing particles */}
            {[...Array(30)].map((_, i) => (
                <div
                    key={i}
                    className="absolute rounded-full bg-[#26d8c4] animate-pulse"
                    style={{
                        width: Math.random() * 4 + 'px',
                        height: Math.random() * 4 + 'px',
                        top: Math.random() * 100 + '%',
                        left: Math.random() * 100 + '%',
                        opacity: Math.random() * 0.4,
                        animationDuration: Math.random() * 2 + 1 + 's',
                        filter: 'blur(1px)'
                    }}
                />
            ))}


            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">

                {/* --- LOGO HOLOGRAM --- */}
                <div className="relative mb-8 group">
                    {/* Holographic floor glow */}
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-12 bg-[#26d8c4] blur-[60px] opacity-40 rounded-[100%] animate-pulse"></div>

                    {/* Logo Image */}
                    <div className="relative z-20 flex items-center justify-center animate-in zoom-in-0 duration-1000 ease-out">
                        <img
                            src="/sikai-logo.png"
                            alt="SIKAI"
                            className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-[0_0_35px_rgba(26,136,255,0.6)] animate-[float_6s_ease-in-out_infinite]"
                        />
                        {/* Glitch Overlay */}
                        <div className="absolute inset-0 bg-transparent mix-blend-color-dodge opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-[url('/noise.png')]"></div>
                    </div>
                </div>

                {/* --- TYPOGRAPHY --- */}
                <div className="text-center relative z-30 px-4">
                    {/* Main Title */}
                    <h1 className="text-7xl md:text-9xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-[#26d8c4] to-[#1a88ff] drop-shadow-2xl font-headline animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-200">
                        SIKAI
                    </h1>

                    {/* Expanding Divider */}
                    <div className="h-[2px] w-0 bg-gradient-to-r from-transparent via-[#26d8c4] to-transparent mx-auto mt-6 mb-8 animate-[expand-width-full_1.5s_cubic-bezier(0.22,1,0.36,1)_forwards_0.8s] shadow-[0_0_15px_#26d8c4]"></div>

                    {/* Subtitle with Interaction */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-sm md:text-lg font-code tracking-[0.2em] animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-500">
                        <span className="text-[#1a88ff] opacity-80 uppercase">Inteligencia Artificial</span>
                        <span className="hidden md:inline text-gray-700">|</span>
                        <span className="relative font-bold text-white uppercase px-4 py-2 bg-[#26d8c4]/10 border border-[#26d8c4]/30 rounded-lg shadow-[0_0_20px_rgba(38,216,196,0.2)] animate-[pulse-glow_3s_infinite]">
                            <span className="text-[#26d8c4] drop-shadow-[0_0_8px_rgba(38,216,196,0.8)]">A TU MEDIDA</span>
                            {/* Corner Accents */}
                            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#26d8c4]"></span>
                            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#26d8c4]"></span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Styles */}
            <style>{`
                @keyframes tunnel-zoom {
                    0% { transform: translateZ(0) scale(0.1); opacity: 0; }
                    50% { opacity: 0.5; }
                    100% { transform: translateZ(500px) scale(2); opacity: 0; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes expand-width-full {
                    0% { width: 0; opacity: 0; }
                    100% { width: 60%; opacity: 1; }
                }
                @keyframes pan-grid {
                    0% { background-position: 0 0; }
                    100% { background-position: 50px 50px; }
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(38,216,196,0.2); border-color: rgba(38,216,196,0.3); }
                    50% { box-shadow: 0 0 40px rgba(38,216,196,0.5); border-color: rgba(38,216,196,0.8); }
                }
            `}</style>
        </div>
    );
}
