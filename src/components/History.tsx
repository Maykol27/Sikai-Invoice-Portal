import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { InvoiceDetails } from './InvoiceDetails';
import { FileText, Calendar, Receipt, Search, ArrowRight, Download, ChevronDown } from 'lucide-react';
import { triggerSmartExport, triggerStandardExport } from '../lib/exportUtils';
import { formatCurrency } from '../lib/utils';

export function History() {
    const { user } = useAuth();
    const [scans, setScans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedScan, setSelectedScan] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);

    const exportMenuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Close export menu on click outside
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
        if (!user) return;

        const fetchScans = async () => {
            try {
                const { data, error } = await supabase
                    .from('scans')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setScans(data || []);
            } catch (error) {
                console.error('Error fetching scans:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchScans();
    }, [user]);

    const filteredScans = scans.filter(scan => {
        const provider = scan.result?.provider_name?.toLowerCase() || '';
        const name = scan.name?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        return provider.includes(search) || name.includes(search);
    });

    const handleExport = (type: 'csv' | 'xlsx' | 'json' | 'txt' | 'xml') => {
        if (filteredScans.length === 0) return;
        triggerStandardExport(filteredScans, type, `sikai_historial`);
        setShowExportMenu(false);
    };

    const handleSmartExport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || filteredScans.length === 0) return;

        triggerSmartExport(file, filteredScans, () => {
            setShowExportMenu(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        });
    };

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-sikai-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-headline font-bold text-gray-900 dark:text-white tracking-tight">Historial</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona tus facturas escaneadas recientemente.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative flex-1 md:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sikai-accent transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar proveedor o fecha..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-sikai-accent/50 focus:border-sikai-accent/50 transition-all font-body shadow-sm dark:shadow-none"
                        />
                    </div>

                    {/* Export Dropdown */}
                    <div className="relative" ref={exportMenuRef}>
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="bg-sikai-accent hover:bg-sikai-secondary text-black font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-sikai-accent/20"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden md:inline">Exportar</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-1">
                                    <button onClick={() => handleExport('xlsx')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                        <span className="text-green-500 font-bold">XLSX</span> Excel
                                    </button>
                                    <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                        <span className="text-blue-500 font-bold">CSV</span> Comma Separated
                                    </button>
                                    <button onClick={() => handleExport('json')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                        <span className="text-yellow-500 font-bold">JSON</span> Data Raw
                                    </button>
                                    <button onClick={() => handleExport('xml')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                        <span className="text-orange-500 font-bold">XML</span> Estructurado
                                    </button>
                                    <button onClick={() => handleExport('txt')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                        <span className="text-gray-500 font-bold">TXT</span> Texto Simple
                                    </button>
                                    <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700 mt-1 pt-2">
                                        <span className="text-purple-500 font-bold">Smart</span> Con Plantilla...
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleSmartExport}
                                        accept=".xlsx"
                                        className="hidden"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Section */}
            {scans.length === 0 ? (
                <EmptyState />
            ) : filteredScans.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5 border-dashed">
                    No se encontraron facturas con esa búsqueda.
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Date grouping logic */}
                    {Object.entries(
                        filteredScans.reduce((groups, scan) => {
                            const date = new Date(scan.created_at).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                            if (!groups[date]) groups[date] = [];
                            groups[date].push(scan);
                            return groups;
                        }, {} as Record<string, any[]>)
                    ).map(([date, items]) => {
                        const dayScans = items as any[];
                        return (
                            <div key={date} className="bg-white/80 dark:bg-black/20 backdrop-blur-md border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-xl dark:shadow-2xl">
                                {/* Group Header */}
                                <div className="bg-gray-50/80 dark:bg-white/5 px-4 py-3 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-900 dark:text-white capitalize flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-sikai-accent" />
                                        {date}
                                    </h3>
                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-sikai-accent/10 text-sikai-accent border border-sikai-accent/20">
                                        {dayScans.length} facturas
                                    </span>
                                </div>

                                {/* Desktop Table Header - Only show for first group or repeated? Maybe just hide/simplified */}
                                <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 p-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-black/20 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <div className="pl-4">Proveedor / Nombre</div>
                                    <div>Hora</div>
                                    <div className="text-center">Items</div>
                                    <div className="text-right">Total</div>
                                    <div className="w-10"></div>
                                </div>

                                {/* Scan List */}
                                <div className="divide-y divide-gray-100 dark:divide-white/5">
                                    {dayScans.map((scan) => (
                                        <ScanItem key={scan.id} scan={scan} onClick={() => setSelectedScan(scan)} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedScan && (
                <InvoiceDetails
                    result={selectedScan.result}
                    imageSrc={null}
                    onClose={() => setSelectedScan(null)}
                    title={selectedScan.name || selectedScan.result?.provider_name}
                    scanId={selectedScan.id}
                />
            )}
        </div>
    );
}

function ScanItem({ scan, onClick }: { scan: any, onClick: () => void }) {
    const date = new Date(scan.created_at).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const time = new Date(scan.created_at).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const amount = formatCurrency(scan.result?.total_amount);

    const providerName = scan.name || scan.result?.provider_name || 'Desconocido';

    return (
        <div
            onClick={onClick}
            className="group grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer items-center"
        >
            {/* Name & Icon */}
            <div className="flex items-center gap-4 pl-0 md:pl-2">
                <div className="w-10 h-10 rounded-lg bg-sikai-accent/10 flex items-center justify-center text-sikai-accent shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Receipt className="w-5 h-5" />
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="font-bold text-gray-900 dark:text-white truncate group-hover:text-sikai-accent transition-colors">{providerName}</span>
                    <span className="md:hidden text-xs text-gray-500">{date} • {time}</span>
                </div>
            </div>

            {/* Time (Desktop) */}
            <div className="hidden md:flex flex-col text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-2">
                    {time}
                </span>
            </div>

            {/* Items Count */}
            <div className="hidden md:flex items-center justify-center">
                <span className="px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-full text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/5 group-hover:border-sikai-accent/20 dark:group-hover:border-white/10 transition-colors">
                    {scan.result?.items?.length || 0} items
                </span>
            </div>

            {/* Amount */}
            <div className="flex md:block items-center justify-between mt-2 md:mt-0 md:text-right">
                <span className="md:hidden text-sm text-gray-500">Total:</span>
                <span className="font-mono font-bold text-sikai-accent tracking-tight text-lg md:text-base">
                    {amount}
                </span>
            </div>

            {/* Action Arrow */}
            <div className="hidden md:flex justify-end pr-2 text-gray-400 dark:text-gray-600 group-hover:text-sikai-accent transition-colors">
                <ArrowRight className="w-5 h-5" />
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl bg-gray-50 dark:bg-white/5">
            <div className="w-16 h-16 bg-white dark:bg-white/5 rounded-full flex items-center justify-center mb-4 shadow-sm dark:shadow-none">
                <FileText className="w-8 h-8 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Aún no hay historial</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                Todas las facturas que escanees aparecerán aquí automáticamente y estarán disponibles por 30 días.
            </p>
        </div>
    );
}
