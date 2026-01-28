import { useEffect, useState } from 'react';
import { X, Calendar, DollarSign, Package, Building2, FileText, MapPin, Phone, User, CreditCard, Clock, Hash, Receipt, Briefcase, FileCheck, Tag, History, MessageSquare, ArrowRightLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn, formatCurrency } from '../lib/utils';
import { SikaiBrain } from './SikaiBrain';
import { SikaiBrainChatModal } from './SikaiBrainChatModal';
import { triggerStandardExport } from '../lib/exportUtils';

interface InvoiceDetailsProps {
    result: any; // Using any to support dynamic fields
    imageSrc?: string | null;
    onClose: () => void;
    title?: string;
    scanId?: string;
}

export function InvoiceDetails({ result, imageSrc, onClose, title, scanId }: InvoiceDetailsProps) {
    const [invoiceData, setInvoiceData] = useState(result);

    // Sync state if prop changes
    useEffect(() => {
        setInvoiceData(result);
    }, [result]);
    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

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

    const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (activeTab === 'history' && scanId) {
            setLoadingHistory(true);
            const fetchHistory = async () => {
                const { data } = await supabase
                    .from('adjustment_history')
                    .select('*')
                    .eq('scan_id', scanId)
                    .order('created_at', { ascending: false });
                setHistoryLogs(data || []);
                setLoadingHistory(false);
            };
            fetchHistory();
        }
    }, [activeTab, scanId]);

    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data } = await supabase.from('invoice_categories').select('*');
            setCategories(data || []);
        };
        fetchCategories();
    }, []);

    // Check if provider has a category
    useEffect(() => {
        if (invoiceData.provider_name) {
            const checkProvider = async () => {
                const { data } = await supabase
                    .from('provider_learning')
                    .select('category_id')
                    .eq('provider_name', invoiceData.provider_name)
                    .maybeSingle();
                if (data) setSelectedCategory(data.category_id);
            };
            checkProvider();
        }
    }, [invoiceData.provider_name]);

    const handleCategoryChange = async (categoryId: string) => {
        setSelectedCategory(categoryId);
        // Update learning
        if (invoiceData.provider_name) {
            await supabase.from('provider_learning').upsert({
                user_id: (await supabase.auth.getUser()).data.user?.id,
                provider_name: invoiceData.provider_name,
                category_id: categoryId
            }, { onConflict: 'user_id,provider_name' });
        }
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

    // Chat Modal State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<Array<{
        id: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: Date;
        type: 'text' | 'voice';
    }>>([]);

    // Voice & Agent Logic
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Show onboarding on first mount
    useEffect(() => {
        const hasSeen = localStorage.getItem('sikai_avatar_seen');
        if (!hasSeen) {
            setShowOnboarding(true);
            const timer = setTimeout(() => setShowOnboarding(false), 8000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAvatarClick = () => {
        console.log('[InvoiceDetails] Avatar clicked, opening chat modal');
        if (showOnboarding) {
            setShowOnboarding(false);
            localStorage.setItem('sikai_avatar_seen', 'true');
        }
        // Open chat modal instead of starting voice directly
        setIsChatOpen(true);
    };

    // Refactored to support both text and voice
    const processAdjustment = async (prompt: string, type: 'text' | 'voice' = 'text') => {
        console.log('[InvoiceDetails] Processing adjustment:', { prompt, type, scanId });

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
            console.log('[InvoiceDetails] Calling adjust-invoice edge function');

            const { data: responseData, error } = await supabase.functions.invoke('adjust-invoice', {
                body: {
                    currentData: invoiceData,
                    userPrompt: prompt,
                    scanId: scanId
                }
            });

            if (error) {
                console.error('[InvoiceDetails] Supabase function error:', error);
                throw error;
            }
            if (responseData?.error) {
                console.error('[InvoiceDetails] Edge function returned error:', responseData.error);
                throw new Error(responseData.error);
            }

            if (responseData?.result) {
                console.log('[InvoiceDetails] Adjustment successful');
                console.log('[InvoiceDetails] Received items (First 5):', responseData.result.items?.slice(0, 5));

                // Update local state IMMEDIATELY
                setInvoiceData(responseData.result);

                // Add success message to chat
                const successMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant' as const,
                    content: '✓ Ajuste aplicado. Puedes ver los cambios reflejados en la factura.',
                    timestamp: new Date(),
                    type: 'text' as const
                };
                setChatMessages(prev => [...prev, successMessage]);
            }

        } catch (e: any) {
            console.error('[InvoiceDetails] Error adjusting invoice:', e, { prompt, type, scanId });
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
            console.log('[InvoiceDetails] Adjustment process completed');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            {/* Modal Container: Fixed height for proper scrolling */}
            <div className="bg-[#0f1218] w-full max-w-7xl h-[85vh] md:h-[90vh] rounded-2xl border border-sikai-accent/20 shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in slide-in-from-bottom-10 duration-500 relative">

                {/* Sikai Agent Avatar (Floating in Modal) */}
                <div className="absolute top-4 right-16 z-50 flex items-center gap-4">
                    {/* Onboarding Bubble */}
                    {showOnboarding && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-700 bg-white text-black p-3 rounded-xl rounded-tr-none shadow-xl max-w-[200px] relative pointer-events-none">
                            <p className="text-xs font-medium leading-relaxed">
                                👋 <b>¡Hola! Soy tu Agente SIKAI.</b><br />
                                Haz click en mí y dime qué corregir. Ej: <i>"Cambia el precio de la cerveza a 5000"</i>
                            </p>
                            <div className="absolute -right-2 top-4 w-4 h-4 bg-white rotate-45"></div>
                        </div>
                    )}

                    <SikaiBrain
                        state={isAdjusting ? 'processing' : 'idle'}
                        onClick={handleAvatarClick}
                        className="cursor-pointer hover:scale-110 transition-transform"
                    />
                </div>

                {/* Left Column: Image Preview (if available) - Hidden on mobile if needed */}
                {imageSrc && (
                    <div className="hidden md:flex w-5/12 bg-black/50 p-6 flex-col justify-center items-center border-r border-gray-800 relative group h-full">
                        <h3 className="absolute top-4 left-4 text-xs font-mono uppercase tracking-widest bg-black/60 px-2 py-1 rounded text-sikai-accent/80 border border-sikai-accent/20">
                            Documento Original
                        </h3>
                        <img
                            src={imageSrc || undefined}
                            alt="Factura Escaneada"
                            className="max-h-full max-w-full object-contain rounded-lg shadow-lg transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>
                )}

                {/* Right Column: Data Details - Added h-full and min-h-0 for scroll fix */}
                <div className={`w-full ${imageSrc ? 'md:w-7/12' : 'w-full'} flex flex-col h-full min-h-0`}>

                    {/* Header */}
                    <div className="p-6 border-b border-gray-800 flex justify-between items-start bg-gray-900/50 shrink-0">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    {result.provider_name || title || 'Detalles de Factura'}
                                </h2>
                                <span className="bg-sikai-accent/10 text-sikai-accent text-[10px] font-bold px-2 py-0.5 rounded border border-sikai-accent/20 uppercase">Verificado</span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                {result.nit && (
                                    <span className="flex items-center gap-1.5">
                                        <Building2 size={13} className="text-gray-500" />
                                        {result.nit}
                                    </span>
                                )}
                                {invoiceData.date && (
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={13} className="text-gray-500" />
                                        {invoiceData.date}
                                    </span>
                                )}
                                {invoiceData.invoice_number && (
                                    <span className="flex items-center gap-1.5">
                                        <FileText size={13} className="text-gray-500" />
                                        Factura #: <span className="text-gray-300">{invoiceData.invoice_number}</span>
                                    </span>
                                )}
                            </div>

                            {/* Category Selector */}
                            <div className="mt-4 flex items-center gap-2">
                                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Categoría:</span>
                                <select
                                    value={selectedCategory || ''}
                                    onChange={async (e) => {
                                        const val = e.target.value;
                                        if (val === 'new') {
                                            const name = prompt("Nombre de la nueva categoría (Ej. Licorera, Ferretería):");
                                            if (name) {
                                                const { data, error: _error } = await supabase.from('invoice_categories').insert({ name }).select().single();
                                                if (data) {
                                                    setCategories(prev => [...prev, data]);
                                                    handleCategoryChange(data.id);
                                                }
                                            }
                                        } else {
                                            handleCategoryChange(val);
                                        }
                                    }}
                                    className="bg-black/30 text-white text-xs rounded border border-gray-700 px-2 py-1 outline-none focus:border-sikai-accent cursor-pointer"
                                >
                                    <option value="">Sin categoría</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                    <option value="new" className="text-sikai-accent font-bold">+ Nueva Categoría...</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex px-6 border-b border-gray-800 bg-gray-900/50 shrink-0">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={cn(
                                "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                                activeTab === 'details'
                                    ? "border-sikai-accent text-sikai-accent"
                                    : "border-transparent text-gray-400 hover:text-white"
                            )}
                        >
                            <FileText size={14} /> Detalles
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={cn(
                                "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                                activeTab === 'history'
                                    ? "border-sikai-accent text-sikai-accent"
                                    : "border-transparent text-gray-400 hover:text-white"
                            )}
                        >
                            <History size={14} /> Historial de Cambios
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[#0f1218]">

                        {activeTab === 'details' ? (
                            <>
                                {/* Totals Summary Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-sikai-accent/5 p-4 rounded-xl border border-sikai-accent/20 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <DollarSign size={40} />
                                        </div>
                                        <div className="text-sikai-accent text-xs uppercase tracking-wider font-bold mb-1">Total Operación</div>
                                        <div className="text-2xl font-bold text-white tracking-tight">
                                            {invoiceData.total_amount ? formatCurrency(result.total_amount) : '$ 0'}
                                        </div>
                                    </div>

                                    <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50 relative overflow-hidden">
                                        <div className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Total IVA</div>
                                        <div className="text-xl font-semibold text-gray-200">
                                            {invoiceData.total_iva || result.iva_amount ? formatCurrency(result.total_iva || result.iva_amount) : '$ 0'}
                                        </div>
                                    </div>

                                    <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50 relative overflow-hidden">
                                        <div className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Subtotal</div>
                                        <div className="text-xl font-semibold text-gray-200">
                                            {invoiceData.subtotal ? formatCurrency(result.subtotal) : '$ 0'}
                                        </div>
                                    </div>
                                </div>

                                {/* All Extracted Fields Grid */}
                                <div>
                                    <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
                                        <FileText size={16} /> Información Detallada
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {Object.entries(result).map(([key, value]) => {
                                            if (key === 'items' || key === 'raw_data' || !value || typeof value === 'object') return null;
                                            const Icon = fieldIcons[key] || FileText;
                                            const label = fieldLabels[key] || key.replace(/_/g, ' ');
                                            const isMoney = (key.includes('amount') || key.includes('total') || key.includes('subtotal') || key.includes('discount')) && typeof value === 'number';

                                            return (
                                                <div key={key} className="p-3 bg-gray-800/20 rounded border border-gray-800 hover:border-gray-700 transition-colors">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Icon size={12} className="text-gray-500" />
                                                        <span className="text-[10px] uppercase text-gray-500 font-bold">{label}</span>
                                                    </div>
                                                    <div className={cn("text-sm text-gray-300 break-words", isMoney && "font-mono font-medium text-sikai-accent")}>
                                                        {isMoney ? formatCurrency(value as number) : String(value)}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Items Table */}
                                {invoiceData.items && Array.isArray(invoiceData.items) && invoiceData.items.length > 0 && (
                                    <div>
                                        <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
                                            <Package size={16} /> Productos ({invoiceData.items.length})
                                        </h3>

                                        <div className="bg-gray-800/20 rounded-xl overflow-hidden border border-gray-800">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse min-w-[600px]">
                                                    <thead>
                                                        <tr className="bg-gray-900/50 text-gray-500 text-[10px] uppercase tracking-wider border-b border-gray-800">
                                                            <th className="p-3 pl-4 font-bold">Código</th>
                                                            <th className="p-3 font-bold">Descripción</th>
                                                            <th className="p-3 text-center font-bold">Cant.</th>
                                                            <th className="p-3 text-right font-bold w-24">Precio Unit.</th>
                                                            <th className="p-3 text-right font-bold w-20">IVA</th>
                                                            <th className="p-3 pr-4 text-right font-bold w-28">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-800/50">
                                                        {invoiceData.items.map((item: any, idx: number) => (
                                                            <tr key={idx} className="hover:bg-white/5 transition-colors group text-sm">
                                                                <td className="p-3 pl-4 text-sikai-accent font-mono text-xs">{item.code || '-'}</td>
                                                                <td className="p-3 text-gray-300 font-medium">{item.description}</td>
                                                                <td className="p-3 text-gray-500 text-center">{item.quantity}</td>
                                                                <td className="p-3 text-gray-400 text-right font-mono">
                                                                    {item.unit_price ? formatCurrency(item.unit_price) : '-'}
                                                                </td>
                                                                <td className="p-3 text-gray-500 text-right text-xs">
                                                                    {item.tax_rate || item.tax_amount ? (item.tax_amount ? formatCurrency(item.tax_amount) : item.tax_rate) : '-'}
                                                                </td>
                                                                <td className="p-3 pr-4 text-white text-right font-mono font-bold group-hover:text-sikai-accent transition-colors">
                                                                    {item.total ? formatCurrency(item.total) : '-'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Raw Data Section */}
                                {invoiceData.raw_data && Object.keys(result.raw_data).length > 0 && (
                                    <div>
                                        <h3 className="text-yellow-500/80 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                            <Hash size={16} /> Datos Extra
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {Object.entries(result.raw_data).map(([k, v]) => (
                                                <div key={k} className="p-2 bg-yellow-500/5 border border-yellow-500/10 rounded">
                                                    <div className="text-[10px] text-yellow-600 uppercase mb-0.5">{k}</div>
                                                    <div className="text-xs text-yellow-200 truncate" title={String(v)}>{String(v)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-6">
                                {loadingHistory ? (
                                    <div className="text-center py-12 text-gray-500 animate-pulse">Cargando historial...</div>
                                ) : historyLogs.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 bg-gray-800/20 rounded-xl border border-dashed border-gray-800">
                                        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        No hay registros de cambios.
                                    </div>
                                ) : (
                                    historyLogs.map((log) => {
                                        // Use Delta if available, else fallback to legacy diff
                                        let changes: { key: string, old: any, new: any }[] = [];

                                        if (log.change_delta && log.change_delta.changes) {
                                            // NEW: Use optimized delta format
                                            log.change_delta.changes.forEach((deltaChange: any) => {
                                                if (deltaChange.type === 'item_update') {
                                                    // Item-level changes
                                                    Object.entries(deltaChange.changes || {}).forEach(([field, values]: [string, any]) => {
                                                        changes.push({
                                                            key: `Item #${deltaChange.index + 1} - ${field}`,
                                                            old: values.old,
                                                            new: values.new
                                                        });
                                                    });
                                                } else if (deltaChange.type === 'item_add') {
                                                    changes.push({
                                                        key: 'Nuevo Item',
                                                        old: 'N/A',
                                                        new: deltaChange.item.description
                                                    });
                                                } else if (deltaChange.type === 'item_delete') {
                                                    changes.push({
                                                        key: 'Item Eliminado',
                                                        old: deltaChange.item.description,
                                                        new: 'N/A'
                                                    });
                                                } else if (deltaChange.type === 'field_updates') {
                                                    // Header field changes
                                                    Object.entries(deltaChange.changes || {}).forEach(([field, values]: [string, any]) => {
                                                        changes.push({
                                                            key: field,
                                                            old: values.old,
                                                            new: values.new
                                                        });
                                                    });
                                                }
                                            });
                                        } else {
                                            // LEGACY: Calculate diff from full snapshots
                                            const prev = log.previous_data || {};
                                            const curr = log.new_data || log.adjusted_data || {};

                                            // Simple 1-level diff for key fields
                                            const keysToCheck = [
                                                'total_amount', 'date', 'provider_name', 'invoice_number',
                                                'subtotal', 'iva_amount', 'nit', 'payment_method'
                                            ];

                                            keysToCheck.forEach(k => {
                                                if (JSON.stringify(prev[k]) !== JSON.stringify(curr[k])) {
                                                    changes.push({ key: k, old: prev[k], new: curr[k] });
                                                }
                                            });

                                            // Check items length change
                                            if (prev.items?.length !== curr.items?.length) {
                                                changes.push({ key: 'items', old: `${prev.items?.length || 0} items`, new: `${curr.items?.length || 0} items` });
                                            }
                                        }

                                        return (
                                            <div key={log.id} className="bg-gray-800/20 border border-gray-800 rounded-xl p-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-sikai-accent/10 flex items-center justify-center text-sikai-accent shrink-0 border border-sikai-accent/20">
                                                        <MessageSquare size={18} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="text-sm font-bold text-white">Solicitud de Cambio</h4>
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(log.created_at).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="bg-black/30 p-3 rounded-lg border border-gray-800 mb-3">
                                                            <p className="text-gray-300 text-sm italic">"{log.user_prompt}"</p>
                                                        </div>

                                                        {/* Diff Visualization */}
                                                        <div className="space-y-1">
                                                            {changes.length > 0 ? (
                                                                <>
                                                                    <div className="text-xs text-gray-500 mb-2">
                                                                        {log.change_delta ? '✨ Cambios (Delta Optimizado)' : 'Cambios detectados'}:
                                                                    </div>
                                                                    {changes.slice(0, 10).map((change, idx) => (
                                                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                                                            <span className="text-gray-500 uppercase font-bold w-32 truncate" title={change.key}>
                                                                                {fieldLabels[change.key] || change.key}
                                                                            </span>
                                                                            <span className="text-red-400 line-through">
                                                                                {String(change.old || 'Vacío')}
                                                                            </span>
                                                                            <ArrowRightLeft size={10} className="text-gray-600" />
                                                                            <span className="text-sikai-accent font-mono font-medium">
                                                                                {String(change.new)}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                    {changes.length > 10 && (
                                                                        <div className="text-xs text-gray-500 italic mt-1">
                                                                            +{changes.length - 10} cambios más...
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                    <ArrowRightLeft size={12} />
                                                                    <span>Cambios complejos o estructurales aplicados.</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-3 rounded-b-2xl">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all font-medium text-sm border border-transparent hover:border-gray-700"
                        >
                            Cerrar
                        </button>
                        <button
                            className="px-6 py-2 bg-sikai-accent hover:bg-sikai-secondary text-black rounded-lg transition-all font-bold text-sm shadow-[0_0_15px_rgba(38,216,196,0.2)] hover:shadow-[0_0_20px_rgba(38,216,196,0.4)] flex items-center gap-2"
                            onClick={() => {
                                // Check if we have a category and custom export logic
                                // For now, simpler implementation: standard export but named nicely
                                triggerStandardExport([result], 'xlsx', `sikai_${selectedCategory ? 'smart_' : ''}${invoiceData.provider_name || 'factura'}`);
                            }}
                        >
                            <DollarSign size={16} /> Exportar Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Chat Modal */}
            <SikaiBrainChatModal
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                onSendMessage={processAdjustment}
                messages={chatMessages}
                isProcessing={isAdjusting}
                invoiceData={result}
            />
        </div >
    );
}
