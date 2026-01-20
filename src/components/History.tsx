import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { InvoiceDetails } from './InvoiceDetails';
import { FileText, Calendar, Receipt, Search, ArrowRight, X } from 'lucide-react';
import { cn } from '../lib/utils';

export function History() {
    const { user } = useAuth();
    const [scans, setScans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedScan, setSelectedScan] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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

        // Also allow searching by formatted date if needed, but provider is most critical
        return provider.includes(search) || name.includes(search);
    });

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

                {/* Search Bar */}
                <div className="relative w-full md:w-64 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sikai-accent transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar proveedor o fecha..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-sikai-accent/50 focus:border-sikai-accent/50 transition-all font-body shadow-sm dark:shadow-none"
                    />
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
                <div className="bg-white/80 dark:bg-black/20 backdrop-blur-md border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-xl dark:shadow-2xl">
                    {/* Desktop Table Header */}
                    <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <div className="pl-4">Proveedor / Nombre</div>
                        <div>Fecha</div>
                        <div className="text-center">Items</div>
                        <div className="text-right">Total</div>
                        <div className="w-10"></div>
                    </div>

                    {/* Scan List */}
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {filteredScans.map((scan) => (
                            <ScanItem key={scan.id} scan={scan} onClick={() => setSelectedScan(scan)} />
                        ))}
                    </div>
                </div>
            )}

            {selectedScan && (
                <InvoiceDetails
                    result={selectedScan.result}
                    imageSrc={null}
                    onClose={() => setSelectedScan(null)}
                    title={selectedScan.name || selectedScan.result?.provider_name}
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

    const amount = scan.result?.total_amount?.toLocaleString('es-ES', {
        style: 'currency',
        currency: scan.result?.currency || 'USD'
    });

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

            {/* Date (Desktop) */}
            <div className="hidden md:flex flex-col text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> {date}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-600 pl-5">{time}</span>
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
