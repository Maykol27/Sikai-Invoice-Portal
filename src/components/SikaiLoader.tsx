
import React from 'react';

export const SikaiLoader = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]">
            <div className="relative flex flex-col items-center">
                {/* Logo Container with Glow */}
                <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse"></div>
                    <div className="relative w-full h-full rounded-xl bg-[#1f1f21] border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-400/10"></div>

                        {/* Animated Scan Line */}
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-[scan_2s_linear_infinite]"></div>

                        <span className="font-bold text-3xl tracking-tighter text-white z-10">
                            SIKAI
                        </span>
                    </div>
                </div>

                {/* Loading Text */}
                <div className="flex flex-col items-center gap-2">
                    <div className="h-1 w-32 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 w-1/2 animate-[shimmer_1.5s_infinite_linear]"></div>
                    </div>
                    <span className="text-xs font-mono text-gray-500 uppercase tracking-widest animate-pulse">
                        Iniciando Sistema...
                    </span>
                </div>
            </div>
        </div>
    );
};
