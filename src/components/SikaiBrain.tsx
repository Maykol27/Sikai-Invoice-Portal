import { cn } from '../lib/utils';
import { Mic, Loader2 } from 'lucide-react';

interface SikaiBrainProps {
    state: 'idle' | 'listening' | 'processing' | 'speaking';
    onClick: () => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function SikaiBrain({ state, onClick, className, size = 'md' }: SikaiBrainProps) {
    const sizeClasses = {
        sm: 'w-10 h-10',
        md: 'w-16 h-16',
        lg: 'w-24 h-24'
    };

    return (
        <div className={cn("relative flex items-center justify-center cursor-pointer group select-none", className)}>

            {/* Outer Glow / Ripple Effect */}
            {state === 'listening' && (
                <>
                    <div className="absolute inset-0 bg-sikai-accent/30 rounded-full animate-ping opacity-75"></div>
                    <div className="absolute -inset-4 bg-sikai-accent/10 rounded-full animate-pulse"></div>
                </>
            )}

            {/* Brain Container */}
            <div
                onClick={onClick}
                className={cn(
                    "relative z-10 bg-[#0f1218] rounded-full border border-sikai-accent/30 shadow-[0_0_15px_rgba(38,216,196,0.3)] flex items-center justify-center transition-all duration-300 overflow-hidden",
                    sizeClasses[size],
                    state === 'idle' && "hover:scale-110 hover:shadow-[0_0_25px_rgba(26,136,255,0.5)]",
                    state === 'processing' && "animate-spin-slow border-t-sikai-accent border-r-transparent border-b-sikai-accent border-l-transparent",
                    state === 'speaking' && "ring-2 ring-sikai-primary animate-bounce-slight"
                )}
            >
                <img
                    src="/sikai-logo.png"
                    alt="Sikai Brain"
                    className={cn(
                        "w-[70%] h-[70%] object-contain transition-all duration-300",
                        state === 'idle' && "filter drop-shadow-lg",
                        state === 'listening' && "scale-90 opacity-80", // Shrink slightly when listening
                        state === 'processing' && "opacity-50 blur-[1px]"
                    )}
                />

                {/* State Icons Overlays */}
                {state === 'listening' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                        <Mic className="text-white animate-pulse" size={size === 'sm' ? 14 : 24} />
                    </div>
                )}

                {state === 'processing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                        <Loader2 className="text-sikai-accent animate-spin" size={size === 'sm' ? 14 : 24} />
                    </div>
                )}
            </div>

            {/* Teaching Bubble / Tooltip (Only visible in idle/hover) */}
            {state === 'idle' && size !== 'sm' && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-black px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none border border-sikai-accent">
                    ¡Hazme click para ayudarte!
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-sikai-accent"></div>
                </div>
            )}
        </div>
    );
}
