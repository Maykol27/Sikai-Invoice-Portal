import { useEffect } from 'react';
import { X, Calendar, DollarSign, Package, Building2, FileText, MapPin, Phone, User, CreditCard, Clock, Hash, Receipt, Briefcase, FileCheck, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

interface InvoiceDetailsProps {
    result: any; // Using any to support dynamic fields
    imageSrc?: string | null;
    onClose: () => void;
    title?: string;
}

export function InvoiceDetails({ result, imageSrc, onClose, title }: InvoiceDetailsProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(val);
    };

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            {/* Modal Container: Used dvh for mobile address bar safety */}
            <div className="bg-[#0f1218] w-full max-w-7xl max-h-[85dvh] md:max-h-[90vh] rounded-2xl border border-sikai-accent/20 shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in slide-in-from-bottom-10 duration-500">

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
                                {result.date && (
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={13} className="text-gray-500" />
                                        {result.date}
                                    </span>
                                )}
                                {result.invoice_number && (
                                    <span className="flex items-center gap-1.5">
                                        <FileText size={13} className="text-gray-500" />
                                        Factura #: <span className="text-gray-300">{result.invoice_number}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Content - Added pb-safe or ample padding */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[#0f1218]">

                        {/* Totals Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-sikai-accent/5 p-4 rounded-xl border border-sikai-accent/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <DollarSign size={40} />
                                </div>
                                <div className="text-sikai-accent text-xs uppercase tracking-wider font-bold mb-1">Total Operación</div>
                                <div className="text-2xl font-bold text-white tracking-tight">
                                    {result.total_amount ? formatCurrency(result.total_amount) : '$ 0'}
                                </div>
                            </div>

                            <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50 relative overflow-hidden">
                                <div className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Total IVA</div>
                                <div className="text-xl font-semibold text-gray-200">
                                    {result.total_iva || result.iva_amount ? formatCurrency(result.total_iva || result.iva_amount) : '$ 0'}
                                </div>
                            </div>

                            <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50 relative overflow-hidden">
                                <div className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Subtotal</div>
                                <div className="text-xl font-semibold text-gray-200">
                                    {result.subtotal ? formatCurrency(result.subtotal) : '$ 0'}
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
                        {result.items && Array.isArray(result.items) && result.items.length > 0 && (
                            <div>
                                <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
                                    <Package size={16} /> Productos ({result.items.length})
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
                                                {result.items.map((item: any, idx: number) => (
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
                        {result.raw_data && Object.keys(result.raw_data).length > 0 && (
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
                            className="px-6 py-2 bg-sikai-accent hover:bg-sikai-secondary text-black rounded-lg transition-all font-bold text-sm shadow-[0_0_15px_rgba(38,216,196,0.2)] hover:shadow-[0_0_20px_rgba(38,216,196,0.4)]"
                            onClick={() => window.print()}
                        >
                            Exportar / Imprimir
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
