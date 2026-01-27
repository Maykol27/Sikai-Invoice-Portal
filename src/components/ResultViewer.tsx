
import { useState, useEffect } from 'react';
import { useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Download, CheckCircle, ArrowLeft, Package, Calendar, Building2, MapPin, Phone, User, CreditCard, Clock, FileText, Hash, Receipt, Briefcase, FileCheck, DollarSign, Tag, ChevronDown, Loader2, RotateCcw } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { SikaiBrain } from './SikaiBrain';
import { SikaiBrainChatModal } from './SikaiBrainChatModal';
import { triggerSmartExport, triggerStandardExport } from '../lib/exportUtils';

interface ResultViewerProps {
    data: any;
    onReset: () => void;
    onUpdate?: (data: any) => void;
    scanId?: string;
}


export function ResultViewer({ data, onReset, onUpdate, scanId }: ResultViewerProps) {
    const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [customTax, setCustomTax] = useState<string>('');

    // Chat Modal State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<Array<{
        id: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: Date;
        type: 'text' | 'voice';
    }>>([]);

    // Voice State (kept for compatibility, but will be managed by chat)
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);

    // History for Undo
    const [history, setHistory] = useState<any[]>([]);

    const handleUndo = () => {
        if (history.length === 0 || !onUpdate) return;
        const previous = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        onUpdate(previous);
    };

    // Show onboarding on mount check
    useEffect(() => {
        const hasSeen = localStorage.getItem('sikai_avatar_main_seen');
        if (!hasSeen) {
            // Delay slightly so it pops up after render
            setTimeout(() => setShowOnboarding(true), 2000);
            // Hide after 10s
            const timer = setTimeout(() => setShowOnboarding(false), 12000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAvatarClick = () => {
        if (showOnboarding) {
            setShowOnboarding(false);
            localStorage.setItem('sikai_avatar_main_seen', 'true');
        }
        // Open chat modal instead of starting voice directly
        setIsChatOpen(true);
    };

    // Refactored to support both text and voice
    const processAdjustment = async (prompt: string, type: 'text' | 'voice' = 'text') => {
        console.log('[ResultViewer] Processing adjustment:', { prompt, type, scanId });

        // Add user message to chat
        const userMessage = {
            id: Date.now().toString(),
            role: 'user' as const,
            content: prompt,
            timestamp: new Date(),
            type
        };
        setChatMessages(prev => [...prev, userMessage]);

        setIsAdjusting(true);
        try {
            console.log('[ResultViewer] Calling adjust-invoice edge function');

            // Get current session token
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
            }

            const { data: responseData, error } = await supabase.functions.invoke('adjust-invoice', {
                body: {
                    currentData: data,
                    userPrompt: prompt,
                    scanId: scanId
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) {
                console.error('[ResultViewer] Supabase function error:', error);
                throw error;
            }
            if (responseData?.error) {
                console.error('[ResultViewer] Edge function returned error:', responseData.error);
                throw new Error(responseData.error);
            }

            if (responseData?.result) {
                console.log('[ResultViewer] Adjustment successful, items count:', responseData.result.items?.length || 0);
                if (onUpdate) {
                    setHistory(prev => [...prev, data]); // Save current state to history
                    onUpdate(responseData.result);
                    console.log('[ResultViewer] Invoice data updated');
                }

                // Add success message to chat
                const successMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant' as const,
                    content: '✓ He actualizado la factura según tu solicitud. Verifica los cambios en la vista.',
                    timestamp: new Date(),
                    type: 'text' as const
                };
                setChatMessages(prev => [...prev, successMessage]);
                console.log('[ResultViewer] Success message added to chat');
            } else {
                console.warn('[ResultViewer] No result data received from edge function');
            }

            // Check for Smart Suggested Rules (Phase 3)
            if (responseData?.suggested_rule) {
                console.log('[ResultViewer] Suggested rule detected:', responseData.suggested_rule);
                setTimeout(async () => {
                    const confirmRule = window.confirm(
                        `🧠 SIKAI Intelligence:\n\n` +
                        `He detectado un patrón en tu corrección:\n` +
                        `"${responseData.suggested_rule.input_pattern}"  👉  "${responseData.suggested_rule.output_product_name}"` +
                        `${responseData.suggested_rule.output_quantity_factor > 1 ? ` (x${responseData.suggested_rule.output_quantity_factor})` : ''}\n\n` +
                        `¿Quieres que aplique esta regla automáticamente en el futuro para este proveedor?`
                    );

                    if (confirmRule) {
                        const { error: ruleError } = await supabase.from('product_learning').insert({
                            provider_name: data.provider_name,
                            input_pattern: responseData.suggested_rule.input_pattern,
                            output_product_name: responseData.suggested_rule.output_product_name,
                            output_quantity_factor: responseData.suggested_rule.output_quantity_factor,
                            user_id: (await supabase.auth.getUser()).data.user?.id
                        });

                        if (ruleError) {
                            console.error('[ResultViewer] Error saving learning rule:', ruleError);
                            alert('Error al guardar la regla: ' + ruleError.message);
                        } else {
                            console.log('[ResultViewer] Learning rule saved successfully');
                            alert('✅ Regla Aprendida! La aplicaré automáticamente la próxima vez.');
                        }
                    }
                }, 500);
            }

        } catch (e: any) {
            console.error('[ResultViewer] Error adjusting invoice:', e, { prompt, type, scanId });
            // Add error message to chat
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                role: 'system' as const,
                content: `❌ Error: ${e.message}`,
                timestamp: new Date(),
                type: 'text' as const
            };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsAdjusting(false);
            console.log('[ResultViewer] Adjustment process completed');
        }
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const initialSelection: Record<string, boolean> = {};
        Object.keys(data).forEach(key => {
            if (key !== 'items' && key !== 'raw_data' && data[key]) {
                initialSelection[key] = true;
            }
        });
        initialSelection['items'] = true;

        // Auto-select raw_data if it has meaningful content
        if (data.raw_data && Object.keys(data.raw_data).length > 0) {
            initialSelection['raw_data'] = true;
        }

        setSelectedFields(initialSelection);
    }, [data]);

    const toggleField = (key: string) => {
        setSelectedFields(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleStandardExport = (type: 'csv' | 'xlsx' | 'json' | 'txt') => {
        // Wrap single data in array for generic util
        triggerStandardExport([data], type, `sikai_scan`);
        setShowExportMenu(false);
    };

    const handleSmartExport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const taxVal = customTax ? parseFloat(customTax) : undefined;

        triggerSmartExport(file, [data], () => {
            setShowExportMenu(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }, taxVal);
    };

    const fieldIcons: Record<string, any> = {
        date: Calendar,
        due_date: Calendar,
        nit: Building2,
        provider_name: Building2,
        total_amount: DollarSign,
        iva_amount: DollarSign,
        total_iva: DollarSign,
        subtotal: DollarSign,
        discount: Tag,
        subtotal_after_discount: DollarSign,
        city: MapPin,
        address: MapPin,
        phone: Phone,
        client_name: User,
        client_nit: User,
        time: Clock,
        invoice_number: FileText,
        dian_resolution_text: FileCheck,
        resolution_dian: FileCheck,
        payment_method: CreditCard,
        seller: Briefcase,
        order_number: Hash,
        remission_number: Receipt,
        amount_text: FileText
    };

    const fieldLabels: Record<string, string> = {
        date: 'Fecha Emisión',
        due_date: 'Vencimiento',
        nit: 'NIT Proveedor',
        provider_name: 'Proveedor',
        total_amount: 'Total Operación',
        iva_amount: 'Total IVA',
        total_iva: 'Total IVA',
        subtotal: 'Subtotal',
        discount: 'Descuento',
        subtotal_after_discount: 'Base Grabable',
        city: 'Ciudad',
        address: 'Dirección',
        phone: 'Teléfono',
        client_name: 'Cliente',
        client_nit: 'NIT Cliente',
        time: 'Hora',
        invoice_number: 'N° Factura',
        resolution_dian: 'Resolución DIAN',
        dian_resolution_text: 'Resolución DIAN',
        payment_method: 'Método Pago',
        seller: 'Vendedor/Zona',
        order_number: 'Orden Compra',
        remission_number: 'Remisión',
        amount_text: 'Valor en Letras'
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onReset}
                        className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors hover:bg-white/5 py-2 px-4 rounded-full"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Escanear otra
                    </button>

                    {history.length > 0 && (
                        <button
                            onClick={handleUndo}
                            className="text-sikai-accent hover:text-white flex items-center gap-2 transition-colors hover:bg-sikai-accent/10 py-2 px-4 rounded-full animate-in fade-in slide-in-from-left-2 border border-sikai-accent/20"
                            title="Deshacer último cambio del Asistente"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Deshacer ({history.length})
                        </button>
                    )}
                </div>
                <div className="relative" ref={exportMenuRef}>
                    <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="bg-sikai-accent hover:bg-sikai-secondary text-black font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-sikai-accent/20"
                    >
                        <Download className="w-4 h-4" />
                        Exportar
                        <ChevronDown className="w-4 h-4" />
                    </button>

                    {showExportMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-[#1a1d24] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="p-1">
                                <button
                                    onClick={() => handleStandardExport('xlsx')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4 text-green-500" />
                                    Excel (.xlsx)
                                </button>
                                <button
                                    onClick={() => handleStandardExport('csv')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4 text-blue-500" />
                                    CSV (.csv)
                                </button>
                                <button
                                    onClick={() => handleStandardExport('json')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4 text-yellow-500" />
                                    JSON (.json)
                                </button>
                            </div>
                            <div className="h-px bg-gray-700 mx-2 my-1"></div>
                            <div className="px-4 py-2">
                                <label className="text-xs text-gray-400 block mb-1">Impuesto por Producto</label>
                                <input
                                    type="number"
                                    placeholder="Ej. 19"
                                    className="w-full bg-black/40 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-sikai-accent outline-none placeholder:text-gray-600"
                                    value={customTax}
                                    onChange={(e) => setCustomTax(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            <div className="h-px bg-gray-700 mx-2 my-1"></div>
                            <div className="p-1">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-2 group"
                                >
                                    <div className="p-1 bg-sikai-accent/10 rounded text-sikai-accent group-hover:bg-sikai-accent group-hover:text-black transition-colors">
                                        <Package className="w-4 h-4" />
                                    </div>
                                    Smart Con Plantilla...
                                </button>
                            </div>
                        </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleSmartExport}
                        accept=".xlsx"
                        className="hidden"
                    />
                </div>
            </div>

            <div className="glass-panel rounded-xl relative overflow-hidden shadow-2xl border border-sikai-accent/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sikai-dark to-sikai-accent"></div>

                {/* Banner SIKAI */}
                {/* Banner SIKAI */}
                <div className="p-8 border-b border-gray-200 dark:border-gray-700/50 bg-white/50 dark:bg-black/40 backdrop-blur-md">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-sikai-accent/10 dark:bg-sikai-accent/20 flex items-center justify-center text-sikai-accent shadow-[0_0_20px_rgba(38,216,196,0.2)]">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-3xl font-headline font-bold text-gray-900 dark:text-white">
                                    Procesado por <span className="text-transparent bg-clip-text bg-gradient-to-r from-sikai-primary to-sikai-accent font-extrabold">SIKAI Intelligence</span>
                                </h2>
                                <span className="bg-sikai-primary/10 text-sikai-primary text-xs font-bold px-2 py-1 rounded border border-sikai-primary/20">v3.1</span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2 bg-gray-100 dark:bg-black/30 w-fit px-3 py-1 rounded-full border border-gray-200 dark:border-white/5 font-medium">
                                <Building2 size={14} className="text-sikai-primary" />
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{data.provider_name || 'Proveedor desconocido'}</span>
                                <span className="text-gray-400 dark:text-gray-600">|</span>
                                <span className="text-gray-600 dark:text-gray-300 font-mono">{data.invoice_number || 'S/N'}</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 mb-1 font-medium">Total Operación</p>
                            <div className="text-4xl font-mono font-bold text-gray-900 dark:text-white tracking-tight">
                                {data.total_amount ? formatCurrency(data.total_amount) : '$0'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="text-sikai-primary" size={20} />
                            Datos Extraídos
                        </h3>
                        <span className="text-xs text-sikai-accent bg-sikai-accent/10 px-3 py-1 rounded-full border border-sikai-accent/20">
                            {Object.values(selectedFields).filter(Boolean).length} campos seleccionados
                        </span>
                    </div>

                    {/* Dynamic Field Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                        {Object.entries(data).map(([key, value]) => {
                            if (key === 'items' || key === 'raw_data' || !value) return null;
                            const Icon = fieldIcons[key] || FileText;
                            const label = fieldLabels[key] || key.replace(/_/g, ' ');
                            const isSelected = selectedFields[key];
                            const isMoney = (key.includes('amount') || key.includes('total') || key.includes('subtotal') || key.includes('discount')) && typeof value === 'number';

                            return (
                                <div
                                    key={key}
                                    onClick={() => toggleField(key)}
                                    className={cn(
                                        "p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none group relative overflow-hidden",
                                        isSelected
                                            ? "bg-sikai-accent/5 border-sikai-accent/40 shadow-[0_0_15px_rgba(38,216,196,0.05)]"
                                            : "bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 group-hover:text-sikai-accent transition-colors">
                                            <Icon size={16} />
                                            <span className="text-xs uppercase tracking-wider font-bold opacity-80">{label}</span>
                                        </div>
                                        <div className={cn(
                                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                            isSelected ? "bg-sikai-accent border-sikai-accent scale-110" : "border-gray-300 dark:border-gray-600 bg-transparent"
                                        )}>
                                            {isSelected && <CheckCircle size={10} className="text-black" />}
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "text-sm font-medium break-words leading-relaxed",
                                        "text-gray-900 dark:text-white",
                                        isMoney && "font-mono text-lg tracking-tight text-sikai-accent"
                                    )}>
                                        {isMoney
                                            ? formatCurrency(value as number)
                                            : String(value)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Items Section Toggle */}
                    {data.items && Array.isArray(data.items) && data.items.length > 0 && (
                        <div className={cn(
                            "rounded-xl border transition-all duration-300 overflow-hidden mb-6",
                            selectedFields['items']
                                ? "bg-gray-900/40 border-sikai-accent/30 shadow-lg"
                                : "bg-gray-800/10 border-gray-700/30 opacity-80"
                        )}>
                            <div
                                onClick={() => toggleField('items')}
                                className="p-4 bg-gray-900/80 flex items-center justify-between cursor-pointer hover:bg-black/50 border-b border-white/5"
                            >
                                <h3 className="text-white font-semibold flex items-center gap-2">
                                    <Package className={cn(selectedFields['items'] ? "text-sikai-accent" : "text-gray-500")} size={20} />
                                    Detalle de Productos ({data.items.length})
                                </h3>
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold border transition-colors",
                                    selectedFields['items'] ? "bg-sikai-accent text-black border-sikai-accent" : "text-gray-400 border-gray-600"
                                )}>
                                    {selectedFields['items'] ? 'Incluido' : 'Excluido'}
                                </div>
                            </div>

                            {/* Detailed Items Table */}
                            {selectedFields['items'] && (
                                <div className="p-0 overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
                                                <th className="py-4 pl-6 font-medium">Código</th>
                                                <th className="py-4 px-4 font-medium min-w-[200px]">Descripción</th>
                                                <th className="py-4 px-4 text-center">Cant.</th>
                                                <th className="py-4 px-4 text-center">U.Med</th>
                                                <th className="py-4 px-4 text-right">Precio Unit.</th>
                                                <th className="py-4 px-4 text-center">IVA %</th>
                                                <th className="py-4 px-4 text-right">IVA Val.</th>
                                                <th className="py-4 pr-6 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {data.items.map((item: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
                                                    <td className="py-4 pl-6 text-sikai-primary font-mono text-xs">{item.code || '-'}</td>
                                                    <td className="py-4 px-4 text-gray-700 dark:text-gray-300 text-sm font-medium">{item.description}</td>
                                                    <td className="py-4 px-4 text-center text-gray-600 dark:text-gray-400 text-sm">{item.quantity}</td>
                                                    <td className="py-4 px-4 text-center text-gray-500 text-xs">{item.unit_measure || 'Und'}</td>
                                                    <td className="py-4 px-4 text-right text-gray-700 dark:text-gray-300 text-sm font-mono">
                                                        {item.unit_price ? formatCurrency(item.unit_price) : '-'}
                                                    </td>
                                                    <td className="py-4 px-4 text-center text-gray-500 text-xs">{item.tax_rate || '0%'}</td>
                                                    <td className="py-4 px-4 text-right text-gray-500 text-xs font-mono">
                                                        {item.tax_amount ? formatCurrency(item.tax_amount) : '-'}
                                                    </td>
                                                    <td className="py-4 pr-6 text-right text-gray-900 dark:text-white font-bold text-sm font-mono group-hover:text-sikai-primary transition-colors">
                                                        {item.total ? formatCurrency(item.total) : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Raw Data Fallout (Optional) */}
                    {data.raw_data && Object.keys(data.raw_data).length > 0 && (
                        <div className={cn(
                            "rounded-xl border transition-all duration-200 overflow-hidden",
                            selectedFields['raw_data']
                                ? "bg-gray-800/20 border-yellow-500/30"
                                : "bg-gray-800/10 border-gray-700/30 opacity-70"
                        )}>
                            <div
                                onClick={() => toggleField('raw_data')}
                                className="p-4 bg-gray-900/50 flex items-center justify-between cursor-pointer hover:bg-gray-900/70"
                            >
                                <h3 className="text-white font-semibold flex items-center gap-2">
                                    <Hash className={cn(selectedFields['raw_data'] ? "text-yellow-500" : "text-gray-500")} size={20} />
                                    Datos Adicionales ({Object.keys(data.raw_data).length})
                                </h3>
                            </div>
                            {selectedFields['raw_data'] && (
                                <div className="p-4 grid grid-cols-2 gap-4">
                                    {Object.entries(data.raw_data).map(([k, v]) => (
                                        <div key={k} className="p-3 bg-black/20 rounded border border-white/5">
                                            <div className="text-xs text-gray-500 uppercase mb-1">{k}</div>
                                            <div className="text-sm text-gray-300">{String(v)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* Floating Voice Button */}
            <div className="fixed bottom-32 md:bottom-6 right-6 z-50 flex flex-col items-end gap-2 transition-all duration-300">
                {isAdjusting && (
                    <div className="bg-black/80 backdrop-blur text-white px-4 py-2 rounded-lg text-sm mb-2 shadow-xl animate-in fade-in slide-in-from-bottom-2 border border-sikai-accent/20 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-sikai-accent" />
                        <span className="text-sikai-accent">AI</span> Procesando cambios...
                    </div>
                )}

                <div className="relative flex flex-col items-end">
                    {/* Onboarding Bubble for Main Screen */}
                    {showOnboarding && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-700 bg-white text-black p-3 rounded-xl rounded-br-none shadow-xl max-w-[200px] mb-2 mr-4 relative pointer-events-none border border-sikai-accent text-right">
                            <p className="text-xs font-medium leading-relaxed">
                                👋 <b>¡Hola! Soy tu Agente SIKAI.</b><br />
                                <span className="opacity-80">Haz click en mí y dime qué ajustar. Ej: <i>"Cambia el precio de la cerveza a 5000"</i></span>
                            </p>
                            {/* Arrow pointing to brain */}
                            <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white rotate-45 border-r border-b border-sikai-accent"></div>
                        </div>
                    )}

                    <SikaiBrain
                        state={isAdjusting ? 'processing' : 'idle'}
                        onClick={handleAvatarClick}
                        className="w-20 h-20 hover:scale-110 transition-transform cursor-pointer"
                        size="lg"
                    />
                </div>

            </div>

            {/* Chat Modal */}
            <SikaiBrainChatModal
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                onSendMessage={processAdjustment}
                messages={chatMessages}
                isProcessing={isAdjusting}
                invoiceData={data}
            />
        </div>
    );
}

