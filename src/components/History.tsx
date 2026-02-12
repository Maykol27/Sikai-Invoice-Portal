import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, DollarSign } from 'lucide-react';

export function History() {
    const [scans, setScans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
                    <div key={scan.id} className="glass-panel p-6 rounded-xl hover:border-sikai-accent transition-colors">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-2 bg-sikai-accent/10 rounded-lg text-sikai-accent">
                                <FileText className="w-6 h-6" />
                            </div>
                            <span className="text-xs text-gray-500 font-code">
                                {new Date(scan.created_at).toLocaleDateString()}
                            </span>
                        </div>

                        <div className="space-y-2 mb-4">
                            <p className="text-white font-medium truncate">{scan.result?.provider_name || 'Desconocido'}</p>
                            <div className="flex items-center text-gray-400 text-sm">
                                <DollarSign className="w-3 h-3 mr-1" />
                                {scan.result?.total_amount || 0}
                            </div>
                        </div>

                        {/* Simple View Details placeholder */}
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <span className="text-xs text-sikai-accent cursor-pointer">Ver Detalles &rarr;</span>
                        </div>
                    </div>
                ))}
            </div>

            {scans.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                    No hay escaneos recientes.
                </div>
            )}
        </div>
    );
}
