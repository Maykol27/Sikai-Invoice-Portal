import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { DollarSign, TrendingUp, ShoppingBag, Receipt } from 'lucide-react';

export function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSpent: 0,
        totalIva: 0,
        scanCount: 0,
        topProvider: 'N/A',
        providerData: [] as any[],
        timelineData: [] as any[],
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: scans, error } = await supabase
                .from('scans')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (!scans || scans.length === 0) {
                setLoading(false);
                return;
            }

            // 1. Calculate Totals
            let totalSpent = 0;
            let totalIva = 0;
            const providerMap: Record<string, number> = {};
            const timelineMap: Record<string, number> = {};

            // Helper to parse amounts safely from various formats (number, string with points/commas)
            const parseAmount = (val: any): number => {
                if (typeof val === 'number') return val;
                if (!val) return 0;
                // Remove everything that is not a digit or a dot/comma
                // Handling typical COP format: 1.000.000 or 1,000,000
                // Simple heuristic: remove all non-digits. If strict decimal needed, would require more logic.
                // For COP/invoices usually standard integer amounts work best for overview.
                const cleanStr = String(val).replace(/[^0-9]/g, '');
                return Number(cleanStr) || 0;
            };

            scans.forEach(scan => {
                const rawAmount = scan.result?.total_amount;
                const rawIva = scan.result?.iva_amount;

                const amount = parseAmount(rawAmount);
                const iva = parseAmount(rawIva);

                const provider = scan.result?.provider_name || 'Desconocido';
                // Using invoice date if available for timeline, else scan date
                const timelineDate = scan.result?.date ? new Date(scan.result.date).toISOString().split('T')[0] : new Date(scan.created_at).toISOString().split('T')[0];

                totalSpent += amount;
                totalIva += iva;

                // Provider Aggregation
                providerMap[provider] = (providerMap[provider] || 0) + amount;

                // Timeline Aggregation
                timelineMap[timelineDate] = (timelineMap[timelineDate] || 0) + amount;
            });

            // 2. Format Provider Data for Chart
            const providerData = Object.entries(providerMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5); // Top 5

            const topProvider = providerData[0]?.name || 'N/A';

            // 3. Format Timeline Data
            const timelineData = Object.entries(timelineMap)
                .map(([date, amount]) => ({ date, amount }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            setStats({
                totalSpent,
                totalIva,
                scanCount: scans.length,
                topProvider,
                providerData,
                timelineData
            });

        } catch (error) {
            console.error("Error loading dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(val);
    };

    const COLORS = ['#26d8c4', '#1a88ff', '#9b5de5', '#f15bb5', '#fee440'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-white">
                Cargando métricas financieras...
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <h2 className="text-3xl font-headline font-bold text-gray-900 dark:text-white mb-2">Dashboard Financiero</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Resumen de tus gastos procesados por IA</p>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-panel p-6 rounded-xl border-l-4 border-l-sikai-accent bg-white/70 dark:bg-black/40">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Gasto Total</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(stats.totalSpent)}</h3>
                        </div>
                        <div className="p-2 bg-sikai-accent/20 rounded-lg text-sikai-accent">
                            <DollarSign size={20} />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-xl border-l-4 border-l-blue-500 bg-white/70 dark:bg-black/40">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total IVA</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(stats.totalIva)}</h3>
                        </div>
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500">
                            <Receipt size={20} />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-xl border-l-4 border-l-purple-500 bg-white/70 dark:bg-black/40">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Proveedor Top</p>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1 truncate max-w-[150px]" title={stats.topProvider}>
                                {stats.topProvider}
                            </h3>
                        </div>
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-500">
                            <ShoppingBag size={20} />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-xl border-l-4 border-l-pink-500 bg-white/70 dark:bg-black/40">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Facturas</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.scanCount}</h3>
                        </div>
                        <div className="p-2 bg-pink-500/20 rounded-lg text-pink-500">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Timeline Area Chart */}
                <div className="glass-panel p-6 rounded-xl bg-white/70 dark:bg-black/40">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Histórico de Gastos</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={stats.timelineData}>
                                <defs>
                                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#26d8c4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#26d8c4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#888888" strokeOpacity={0.2} />
                                <XAxis dataKey="date" stroke="#888888" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#888888" tick={{ fontSize: 12 }} tickFormatter={(val) => `$${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--color-base-card)',
                                        borderColor: 'var(--color-base-border)',
                                        color: 'var(--color-base-content)',
                                        borderRadius: '12px'
                                    }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#26d8c4" fillOpacity={1} fill="url(#colorAmount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Providers Pie Chart */}
                <div className="glass-panel p-6 rounded-xl bg-white/70 dark:bg-black/40">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Gasto por Proveedor (Top 5)</h3>
                    <div style={{ width: '100%', height: 300 }} className="flex items-center justify-center">
                        {stats.providerData.length > 0 ? (
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={stats.providerData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {stats.providerData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--color-base-card)',
                                            borderColor: 'var(--color-base-border)',
                                            color: 'var(--color-base-content)',
                                            borderRadius: '12px'
                                        }}
                                        formatter={(value: number) => formatCurrency(value)}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-gray-500">No hay datos suficientes</p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-4 justify-center mt-4">
                        {stats.providerData.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
