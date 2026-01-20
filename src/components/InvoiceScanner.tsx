import { useState, useRef, useCallback } from 'react';
import { Upload, Zap, ShieldCheck, Camera, CheckCircle2, XCircle, Loader2, FileText, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface InvoiceScannerProps {
    onScanComplete: (data: any) => void;
}

interface QueueItem {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'completed' | 'error';
    result?: any;
    errorText?: string;
}

export function InvoiceScanner({ onScanComplete }: InvoiceScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Bulk Upload State
    const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);
    const [processedCount, setProcessedCount] = useState(0);

    const processQueueItem = async (item: QueueItem) => {
        try {
            // Update status to processing
            setUploadQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));

            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(item.file);
            });

            const { data, error } = await supabase.functions.invoke('scan-invoice', {
                body: {
                    imageBase64: base64,
                    mimeType: item.file.type,
                    name: item.file.name
                }
            });

            if (error) throw error;

            if (data && data.result) {
                setUploadQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'completed', result: data.result } : i));
            } else {
                throw new Error("No data returned");
            }

        } catch (error) {
            console.error(`Error processing ${item.file.name}:`, error);
            setUploadQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorText: 'Error al procesar' } : i));
        } finally {
            setProcessedCount(prev => prev + 1);
        }
    };

    const processQueue = async (items: QueueItem[]) => {
        // Sequential processing
        for (const item of items) {
            await processQueueItem(item);
        }
        setIsScanning(false);
    };

    const handleBatchUpload = (files: FileList | File[]) => {
        const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));

        if (fileArray.length === 0) return;

        if (fileArray.length > 50) {
            setUploadError('Máximo 50 facturas a la vez.');
            return;
        }

        setIsScanning(true);
        setUploadError(null);
        setProcessedCount(0);

        // Initialize Queue
        const newQueue: QueueItem[] = fileArray.map(file => ({
            id: Math.random().toString(36).substring(7),
            file,
            status: 'pending'
        }));

        setUploadQueue(newQueue);

        // Start processing
        processQueue(newQueue);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            handleBatchUpload(e.dataTransfer.files);
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

    // If queue is finished and we have results, show summary or allow finish
    const isQueueFinished = uploadQueue.length > 0 && processedCount === uploadQueue.length;
    const completedItems = uploadQueue.filter(i => i.status === 'completed');

    return (
        <div className="h-full flex flex-col justify-center max-w-5xl mx-auto px-4 animate-in fade-in duration-700">
            {/* Header Content - Compact & Clean */}
            <div className="text-center mb-8 space-y-2">
                <h1 className="text-4xl md:text-6xl font-headline font-bold text-gray-900 dark:text-white tracking-tight">
                    Digitalización <span className="text-sikai-accent drop-shadow-[0_0_15px_rgba(26,136,255,0.4)]">Inteligente</span>
                </h1>
                <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
                    Extrae datos de tus facturas en segundos con nuestra IA.
                </p>
            </div>

            {/* Immersive Drop Zone */}
            {!isScanning && !isQueueFinished && (
                <div
                    className={cn(
                        "relative w-full aspect-[2/1] md:aspect-[2.5/1] rounded-3xl overflow-hidden transition-all duration-500",
                        "border border-dashed backdrop-blur-xl group cursor-pointer",
                        // Light mode styles vs Dark mode styles
                        "bg-white/80 border-gray-300 hover:border-sikai-accent/50 hover:bg-gray-50",
                        "dark:bg-black/40 dark:border-gray-700/50 dark:hover:bg-black/60",
                        isDragging
                            ? "border-sikai-accent shadow-[0_0_40px_rgba(26,136,255,0.3)] bg-sikai-accent/5"
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
                        multiple // Enable multiple files
                        onChange={(e) => e.target.files && handleBatchUpload(e.target.files)}
                    />

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
                            {isDragging ? '¡Sueltala ya!' : 'Sube tus Facturas'}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-500 text-sm max-w-sm">
                            Haz clic o arrastra tus archivos aquí. <br />
                            <span className="text-xs opacity-60">Soporta JPG, PNG (Max 50)</span>
                        </p>
                    </div>
                </div>
            )}

            {/* Queue List / Processing View */}
            {(isScanning || isQueueFinished) && (
                <div className="w-full bg-white/80 dark:bg-black/20 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {isScanning ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-sikai-accent" />
                                        Procesando Lote...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        Proceso Completado
                                    </>
                                )}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {processedCount} de {uploadQueue.length} archivos procesados
                            </p>
                        </div>
                        {isQueueFinished && (
                            <button
                                onClick={() => {
                                    setUploadQueue([]);
                                    setProcessedCount(0);
                                    if (completedItems.length > 0) {
                                        onScanComplete(completedItems[completedItems.length - 1].result);
                                    }
                                }}
                                className="px-4 py-2 bg-sikai-accent hover:bg-sikai-secondary text-black font-bold text-sm rounded-lg transition-colors flex items-center gap-2"
                            >
                                Continuar <ArrowRight size={16} />
                            </button>
                        )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                        {uploadQueue.map((item) => (
                            <div key={item.id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                        item.status === 'completed' ? "bg-green-500/10 text-green-500" :
                                            item.status === 'error' ? "bg-red-500/10 text-red-500" :
                                                item.status === 'processing' ? "bg-sikai-accent/10 text-sikai-accent" :
                                                    "bg-gray-100 dark:bg-white/5 text-gray-400"
                                    )}>
                                        <FileText size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px] md:max-w-md">
                                        {item.file.name}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {item.status === 'pending' && <span className="text-xs text-gray-400">En cola...</span>}
                                    {item.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-sikai-accent" />}
                                    {item.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                    {item.status === 'error' && (
                                        <div className="flex items-center gap-1 text-red-500 text-xs text-right">
                                            <span>Error</span>
                                            <XCircle className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Progress Bar Bottom */}
                    <div className="h-1 bg-gray-100 dark:bg-white/5 w-full">
                        <div
                            className="h-full bg-sikai-accent transition-all duration-300 ease-out"
                            style={{ width: `${(processedCount / uploadQueue.length) * 100}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Trust Indicators - Only show when not scanning */}
            {!isScanning && !isQueueFinished && (
                <div className="mt-8 flex flex-col items-center gap-6">
                    {/* Camera Action Button */}
                    <input
                        type="file"
                        ref={cameraInputRef}
                        className="hidden"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => e.target.files && handleBatchUpload(e.target.files)}
                    />

                    <button
                        onClick={() => !isScanning && cameraInputRef.current?.click()}
                        disabled={isScanning}
                        className="flex items-center gap-2 px-6 py-3 bg-white/10 dark:bg-black/20 hover:bg-sikai-accent/10 border border-sikai-border hover:border-sikai-accent rounded-full transition-all group"
                    >
                        <Camera className="w-5 h-5 text-sikai-accent group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-sikai-accent">Tomar Foto</span>
                    </button>

                    <div className="flex justify-center gap-6 text-gray-400 dark:text-gray-500 text-xs font-medium tracking-wider uppercase opacity-80 dark:opacity-60">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-sikai-secondary" />
                            <span>Encriptado</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap size={14} className="text-sikai-secondary" />
                            <span>Rápido</span>
                        </div>
                    </div>
                </div>
            )}

            {uploadError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-sm text-center">
                    {uploadError}
                </div>
            )}
        </div>
    );
}
