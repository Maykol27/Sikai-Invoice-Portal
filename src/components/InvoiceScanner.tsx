import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertCircle, Coins } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

interface InvoiceScannerProps {
    onScanComplete: (data: any) => void;
}

export function InvoiceScanner({ onScanComplete }: InvoiceScannerProps) {
    const { user, credits } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [fields, setFields] = useState({
        fecha: true,
        nit: true,
        proveedor: true,
        total: true,
        iva: false,
        ciudad: false,
    });

    const toggleField = (key: keyof typeof fields) => {
        setFields(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const processFile = async (file: File) => {
        if (!file) return;
        if (!user) {
            setError("Debes iniciar sesión para escanear facturas.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const getBase64 = (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => {
                        const result = reader.result as string;
                        const base64 = result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = error => reject(error);
                });
            };

            const base64 = await getBase64(file);

            // Call Edge Function (AI Analysis + Persistence + Credits)
            const { data: aiData, error: fnError } = await supabase.functions.invoke('scan-invoice', {
                body: { imageBase64: base64, mimeType: file.type }
            });

            if (fnError) {
                // Handle Function Invocation Errors
                if (fnError.context?.response?.status === 402) {
                    throw new Error("No tienes suficientes créditos para realizar esta acción.");
                }
                throw new Error(`Error de conexión (AI): ${fnError.message}`);
            }

            if (aiData?.error) {
                if (aiData.code === 'NO_CREDITS') {
                    throw new Error("No tienes suficientes créditos para realizar esta acción.");
                }
                throw new Error(`Error de análisis: ${aiData.error}`);
            }

            if (!aiData?.result) throw new Error("No se pudieron extraer datos de la imagen.");

            const result = aiData.result;

            // Success!
            onScanComplete(result);

        } catch (err: any) {
            console.error('Full Error:', err);
            setError(err.message || 'Ocurrió un error desconocido.');
        } finally {
            setLoading(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Config Panel */}
            <div className="lg:col-span-4 space-y-6">

                {/* Credits Display */}
                <div className="glass-panel p-6 rounded-xl shadow-lg border border-sikai-accent/20 bg-sikai-accent/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-sikai-accent/20 rounded-lg text-sikai-accent">
                                <Coins className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Créditos</h3>
                                <p className="text-gray-400 text-sm">Disponibles</p>
                            </div>
                        </div>
                        <span className="text-3xl font-headline font-bold text-white">
                            {credits !== null ? credits : '-'}
                        </span>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-xl shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-sikai-accent/20 rounded-full blur-3xl group-hover:bg-sikai-accent/30 transition-all"></div>

                    <h3 className="font-headline text-xl font-semibold mb-6 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-sikai-accent" />
                        Datos a Extraer
                    </h3>

                    <div className="space-y-4">
                        {Object.entries(fields).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                                <span className="text-gray-300 font-medium capitalize">{key.replace('_', ' ')}</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={value}
                                        onChange={() => toggleField(key as keyof typeof fields)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sikai-accent"></div>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Drop Zone */}
            <div className="lg:col-span-8 space-y-6">

                {error && (
                    <div className="glass-panel border-red-500/50 bg-red-500/10 p-4 rounded-xl flex items-center gap-3 text-red-200 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p>{error}</p>
                    </div>
                )}

                <div
                    className={cn(
                        "glass-panel border-2 border-dashed border-gray-700 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors hover:border-sikai-accent hover:bg-gray-900/50 relative overflow-hidden min-h-[400px]",
                        loading && "opacity-50 pointer-events-none"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
                    }}
                >
                    {loading ? (
                        <div className="flex flex-col items-center animate-pulse">
                            <Loader2 className="w-12 h-12 text-sikai-accent animate-spin mb-4" />
                            <p className="text-xl font-bold text-white">Procesando con IA...</p>
                            <p className="text-sm text-gray-400">Extrayendo datos y guardando...</p>
                        </div>
                    ) : (
                        <>
                            <div className="scan-line"></div>

                            <div className="z-10 flex flex-col items-center">
                                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-sikai-accent">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Sube tu factura digital</h3>
                                <p className="text-gray-400 mb-6">Arrastra y suelta o haz clic para explorar</p>

                                <div className="flex gap-3">
                                    <button className="bg-sikai-accent text-black font-bold px-6 py-2 rounded-full hover:bg-white transition-colors flex items-center gap-2">
                                        Explorar Archivos
                                    </button>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) processFile(e.target.files[0]);
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
