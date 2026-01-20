import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Zap, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';

interface InvoiceScannerProps {
    onScanComplete: (data: any) => void;
}

export function InvoiceScanner({ onScanComplete }: InvoiceScannerProps) {
    const { user } = useAuth();
    const [isScanning, setIsScanning] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const processFile = async (file: File) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => setCurrentImage(e.target?.result as string);
        reader.readAsDataURL(file);

        setIsScanning(true);
        setUploadError(null);

        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result as string;
                    if (result) {
                        resolve(result.split(',')[1]);
                    } else {
                        reject(new Error("Failed to read file"));
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const { data, error } = await supabase.functions.invoke('scan-invoice', {
                body: {
                    imageBase64: base64,
                    mimeType: file.type,
                    name: file.name
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            if (data && data.result) {
                onScanComplete(data.result);
            } else {
                console.warn("Unexpected response structure:", data);
                onScanComplete(data);
            }

        } catch (error: any) {
            console.error('Error scanning invoice:', error);
            setUploadError(error.message || 'Error al procesar la factura');
            setIsScanning(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            processFile(file);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const resetSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImage(null);
        setIsScanning(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    return (
        <div className="h-full flex flex-col justify-center max-w-5xl mx-auto px-4 animate-in fade-in duration-700">
            {/* Header Content - Compact & Clean */}
            <div className="text-center mb-8 space-y-2">
                <h1 className="text-4xl md:text-6xl font-headline font-bold text-gray-900 dark:text-white tracking-tight">
                    Digitalización <span className="text-sikai-accent drop-shadow-[0_0_15px_rgba(38,216,196,0.3)]">Inteligente</span>
                </h1>
                <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
                    Extrae datos de tus facturas en segundos con nuestra IA.
                </p>
            </div>

            {/* Immersive Drop Zone */}
            <div
                className={cn(
                    "relative w-full aspect-[2/1] md:aspect-[2.5/1] rounded-3xl overflow-hidden transition-all duration-500",
                    "border border-dashed backdrop-blur-xl group cursor-pointer",
                    // Light mode styles vs Dark mode styles
                    "bg-white/80 border-gray-300 hover:border-sikai-accent/50 hover:bg-gray-50",
                    "dark:bg-black/40 dark:border-gray-700/50 dark:hover:bg-black/60",
                    isDragging
                        ? "border-sikai-accent shadow-[0_0_40px_rgba(38,216,196,0.2)] bg-sikai-accent/5"
                        : "",
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !isScanning && fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                />

                {/* SIKAI Logo Loading State */}
                {isScanning && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/90 dark:bg-black/80 backdrop-blur-sm">
                        <div className="relative">
                            <img
                                src="/sikai-logo.png"
                                alt="Procesando..."
                                className="w-24 h-24 object-contain animate-pulse drop-shadow-[0_0_20px_rgba(38,216,196,0.6)]"
                            />
                            <div className="absolute -inset-4 bg-sikai-accent/20 rounded-full blur-xl animate-pulse"></div>
                        </div>
                        <p className="mt-6 text-sikai-accent font-mono text-sm tracking-[0.2em] animate-pulse">ANALIZANDO...</p>
                    </div>
                )}

                {/* Image Preview */}
                {currentImage && !isScanning && (
                    <div className="absolute inset-0 z-0 opacity-40 blur-sm">
                        <img
                            src={currentImage}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-black"></div>
                    </div>
                )}

                {/* Idle Content */}
                {!isScanning && !currentImage && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center transform transition-transform duration-300 group-hover:scale-105">
                        <div className={cn(
                            "w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-300",
                            // Light mode icon bg
                            "bg-gradient-to-br from-white to-gray-100 border border-gray-200 text-gray-400",
                            // Dark mode icon bg
                            "dark:bg-gradient-to-br dark:from-gray-800 dark:to-black dark:border-white/5 dark:text-gray-400",
                            isDragging ? "text-sikai-accent border-sikai-accent/50 scale-110" : "group-hover:text-sikai-accent group-hover:border-sikai-accent/30"
                        )}>
                            {isDragging ? <Upload size={32} className="animate-bounce" /> : <Upload size={32} />}
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight group-hover:text-shadow-glow transition-all">
                            {isDragging ? '¡Sueltala ya!' : 'Sube tu Factura'}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-500 text-sm max-w-sm">
                            Haz clic o arrastra tu archivo aquí. <br />
                            <span className="text-xs opacity-60">Soporta JPG, PNG</span>
                        </p>
                    </div>
                )}
            </div>

            {/* Trust Indicators - Simplified */}
            <div className="mt-8 flex justify-center gap-6 text-gray-400 dark:text-gray-500 text-xs font-medium tracking-wider uppercase opacity-80 dark:opacity-60">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-sikai-secondary" />
                    <span>Encriptado</span>
                </div>
                <div className="flex items-center gap-2">
                    <Zap size={14} className="text-sikai-secondary" />
                    <span>Rápido</span>
                </div>
            </div>

            {uploadError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-sm text-center">
                    {uploadError}
                </div>
            )}
        </div>
    );
}
