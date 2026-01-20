import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Loader2, ScanLine, Zap, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { InvoiceDetails } from './InvoiceDetails';

interface InvoiceScannerProps {
    onScanComplete: (data: any) => void;
}

export function InvoiceScanner({ onScanComplete }: InvoiceScannerProps) {
    const { user } = useAuth();
    const [isScanning, setIsScanning] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<any>(null); // For handling the result locally if needed
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const processFile = async (file: File) => {
        if (!file) return;

        // Show immediate preview
        const reader = new FileReader();
        reader.onload = (e) => setCurrentImage(e.target?.result as string);
        reader.readAsDataURL(file);

        setIsScanning(true);
        setUploadError(null);

        try {
            // Convert to base64
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

            // Play success sound effect if            // Unwrap the result to pass only the extracted data
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

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 relative">
            {/* Background ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sikai-accent/10 rounded-full blur-[100px] -z-10 pointer-events-none animate-pulse-slow"></div>

            <div className="text-center mb-12 space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sikai-accent/10 border border-sikai-accent/20 text-sikai-accent text-sm font-medium mb-4 animate-fade-in-up">
                    <Zap size={14} className="fill-sikai-accent" />
                    <span>Motor de IA v2.0 Activado</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-headline font-black text-white tracking-tight animate-fade-in-up delay-100">
                    Sube tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-sikai-primary to-sikai-accent">Factura</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto animate-fade-in-up delay-200">
                    Arrastra tu documento a la zona de escaneo holográfica. Nuestra IA inteligente extraerá cada detalle en segundos.
                </p>
            </div>

            {/* Immersive Drop Zone */}
            <div
                className={cn(
                    "relative group w-full aspect-video md:aspect-[2/1] rounded-3xl overflow-hidden transition-all duration-500",
                    "border-2 border-dashed bg-black/40 backdrop-blur-xl",
                    isDragging
                        ? "border-sikai-accent scale-[1.02] shadow-[0_0_50px_rgba(38,216,196,0.3)]"
                        : "border-gray-700/50 hover:border-sikai-accent/50 hover:shadow-[0_0_30px_rgba(26,136,255,0.1)]",
                    isScanning ? "border-transparent" : ""
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

                {/* Laser Scanning Animation Overlay */}
                {isScanning && (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-[5px] bg-sikai-accent shadow-[0_0_20px_rgba(38,216,196,1)] animate-scan"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-sikai-accent/10 to-transparent h-20 animate-scan-trail"></div>

                        {/* Grid Overlay inside scanner */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(38,216,196,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(38,216,196,0.1)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>

                        <div className="absolute bottom-10 left-0 w-full text-center">
                            <div className="inline-flex items-center gap-3 bg-black/80 backdrop-blur-md border border-sikai-accent/30 px-6 py-3 rounded-full">
                                <Loader2 className="w-5 h-5 text-sikai-accent animate-spin" />
                                <span className="text-sikai-accent font-mono tracking-widest uppercase text-sm">Analizando Datos...</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Image Preview Background */}
                {currentImage && (
                    <div className="absolute inset-0 z-0">
                        <img
                            src={currentImage}
                            alt="Preview"
                            className={cn(
                                "w-full h-full object-cover transition-all duration-700",
                                isScanning ? "opacity-40 blur-sm scale-105" : "opacity-30 blur-md grayscale"
                            )}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                    </div>
                )}

                {/* Idle Content */}
                {!isScanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 pointer-events-none">
                        <div className={cn(
                            "w-24 h-24 rounded-full bg-gradient-to-tr from-gray-800 to-gray-900 flex items-center justify-center mb-6 shadow-2xl transition-transform duration-500 group-hover:scale-110",
                            isDragging ? "text-sikai-accent" : "text-gray-400 group-hover:text-white"
                        )}>
                            {isDragging ? <ScanLine size={48} className="animate-pulse" /> : <Upload size={40} />}
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-sikai-accent transition-colors">
                            {isDragging ? '¡Suelta para procesar!' : 'Arrastra tu factura aquí'}
                        </h3>
                        <p className="text-gray-400 mb-8 max-w-md text-center">
                            Soporta JPG, PNG. Procesamiento seguro y encriptado.
                        </p>

                        <button className="pointer-events-auto bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-sikai-accent/50 px-8 py-3 rounded-xl transition-all duration-300 backdrop-blur-sm font-medium flex items-center gap-2 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                            <FileText size={18} />
                            Seleccionar Archivo
                        </button>
                    </div>
                )}
            </div>

            {/* Footer Trust Indicators */}
            <div className="mt-12 flex justify-center gap-8 text-gray-500 text-sm font-medium max-w-2xl mx-auto">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-sikai-accent" />
                    <span>Encriptación End-to-End</span>
                </div>
                <div className="flex items-center gap-2">
                    <Zap size={16} className="text-sikai-accent" />
                    <span>Procesamiento &lt; 3s</span>
                </div>
            </div>

            {uploadError && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-center backdrop-blur-md animate-in slide-in-from-bottom-2">
                    {uploadError}
                </div>
            )}
        </div>


    );
}
