import React, { useState, useEffect } from 'react';
import { Brain, ScanLine, LayoutDashboard, History, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export function OnboardingTour() {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const completed = localStorage.getItem('sikai_tour_completed');
        if (!completed) {
            // Small delay to ensure smooth entrance after app load
            setTimeout(() => setIsOpen(true), 1000);
        }
    }, []);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsOpen(false);
            localStorage.setItem('sikai_tour_completed', 'true');
        }, 300); // Match animation duration
    };

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            handleClose();
        }
    };

    if (!isOpen) return null;

    const steps = [
        {
            icon: Brain,
            title: "Bienvenido a Sikai",
            description: "Tu herramienta de digitalización inteligente. Organiza, escanea y gestiona tus facturas con facilidad.",
            color: "text-sikai-primary"
        },
        {
            icon: ScanLine,
            title: "Escaneo Inteligente",
            description: "Sube tus facturas o toma una foto. Nuestra IA extrae los datos automáticamente por ti.",
            color: "text-sikai-accent"
        },
        {
            icon: LayoutDashboard,
            title: "Control Total",
            description: "Visualiza tus gastos, categorías y principales proveedores en tiempo real desde tu Dashboard.",
            color: "text-blue-500"
        },
        {
            icon: History,
            title: "Historial Detallado",
            description: "Consulta, filtra y exporta el registro completo de todas tus facturas digitalizadas.",
            color: "text-purple-500"
        },
        {
            icon: CheckCircle2,
            title: "¡Todo Listo!",
            description: "Ya tienes todo lo necesario para empezar. Simplifica tu gestión financiera hoy mismo.",
            color: "text-green-500"
        }
    ];

    const CurrentIcon = steps[step].icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className={twMerge(
                    "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
                    isExiting ? "opacity-0" : "opacity-100"
                )}
                onClick={handleClose}
            />

            {/* Modal */}
            <div className={twMerge(
                "relative bg-white dark:bg-[#0f1115] w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-sikai-border overflow-hidden transition-all duration-300 transform",
                isExiting ? "scale-95 opacity-0" : "scale-100 opacity-100"
            )}>
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 dark:bg-white/5">
                    <div
                        className="h-full bg-sikai-primary transition-all duration-500 ease-out"
                        style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                    />
                </div>

                <div className="p-8 pt-12 flex flex-col items-center text-center">
                    {/* Icon Circle */}
                    <div className={twMerge(
                        "w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-500",
                        "bg-gray-50 dark:bg-white/5 shadow-inner"
                    )}>
                        <CurrentIcon className={twMerge("w-10 h-10 transition-colors duration-300", steps[step].color)} />
                    </div>

                    {/* Content */}
                    <div className="min-h-[120px]">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500 key={step}">
                            {steps[step].title}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm animate-in fade-in slide-in-from-bottom-3 duration-700 key={step}-desc">
                            {steps[step].description}
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="w-full flex items-center justify-between mt-8">
                        <div className="flex gap-2">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={twMerge(
                                        "w-2 h-2 rounded-full transition-all duration-300",
                                        i === step ? "bg-sikai-primary w-4" : "bg-gray-200 dark:bg-white/10"
                                    )}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleNext}
                            className="bg-sikai-primary hover:bg-sikai-primary/90 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all hover:scale-105 shadow-lg shadow-sikai-primary/20"
                        >
                            {step === steps.length - 1 ? 'Comenzar' : 'Siguiente'}
                            {step < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
