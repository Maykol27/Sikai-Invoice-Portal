import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, DollarSign } from 'lucide-react';
import { InvoiceDetails } from './InvoiceDetails';

export function History() {
    const [scans, setScans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedScan, setSelectedScan] = useState<any>(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const { data, error } = await supabase
            .from('scans')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setScans(data || []);
        setLoading(false);
    };

    if (loading) return <div className="text-white text-center">Cargando historial...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-headline font-bold text-white mb-8">Historial de Escaneos (30 días)</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scans.map((scan) => (
                    <div
                        key={scan.id}
                        className="glass-panel p-6 rounded-xl hover:border-sikai-accent transition-colors cursor-pointer group"
                        onClick={() => setSelectedScan(scan)}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-2 bg-sikai-accent/10 rounded-lg text-sikai-accent group-hover:bg-sikai-accent group-hover:text-black transition-colors">
                                <FileText className="w-6 h-6" />
                            </div>
                            <span className="text-xs text-gray-500 font-code">
                                {new Date(scan.created_at).toLocaleDateString()}
                            </span>
                        </div>

                        <div className="space-y-2 mb-4">
                            {/* Prefer 'name', then 'provider_name', then fallback */}
                            <h3 className="text-white font-bold truncate text-lg">
                                {scan.name || scan.result?.provider_name || 'Sin Nombre'}
                            </h3>
                            <p className="text-gray-400 text-sm truncate">
                                {scan.name ? (scan.result?.provider_name || 'Proveedor desc.') : ''}
                            </p>

                            <div className="flex items-center text-sikai-accent font-mono text-lg pt-2">
                                <DollarSign className="w-4 h-4 mr-1" />
                                {scan.result?.total_amount?.toLocaleString() || 0}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                                {scan.result?.items?.length || 0} items
                            </span>
                            <span className="text-xs text-sikai-accent group-hover:translate-x-1 transition-transform">
                                Ver Detalles &rarr;
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {selectedScan && (
                <InvoiceDetails
                    result={selectedScan.result}
                    // History doesn't have the image saved currently, so pass null
                    imageSrc={null}
                    onClose={() => setSelectedScan(null)}
                    title={selectedScan.name || selectedScan.result?.provider_name}
                />
            )}

            {scans.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                    No hay escaneos recientes.
                </div>
            )}
        </div>
    );
}
