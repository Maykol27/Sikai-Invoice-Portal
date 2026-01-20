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

    const COLORS = ['#1a88ff', '#26d8c4', '#3b82f6', '#0ea5e9', '#6366f1'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-sikai-primary animate-pulse">
                Cargando métricas financieras...
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-3xl font-headline font-bold text-gray-900 dark:text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-sikai-primary to-sikai-cyan">
                    Dashboard Financiero
                </h2>
                <p className="text-gray-500 dark:text-gray-400">Vista general de tu operación inteligente</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Total Spent Card */}
                <div className="glass-panel p-6 rounded-2xl border border-sikai-border/50 bg-gradient-to-br from-white/80 to-white/40 dark:from-[#1a1d24]/80 dark:to-[#0f1115]/40 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(26,136,255,0.15)] transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sikai-primary/10 rounded-full blur-2xl -mr-10 -mt-10 transition-opacity opacity-50 group-hover:opacity-100"></div>

                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium tracking-wide">GASTO TOTAL</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 font-mono tracking-tight">
                                {formatCurrency(stats.totalSpent)}
                            </h3>
                        </div>
                        <div className="p-3 bg-sikai-primary/10 rounded-xl text-sikai-primary ring-1 ring-sikai-primary/20 shadow-inner">
                            <DollarSign size={20} />
                        </div>
                    </div>
                </div>

                {/* Total IVA Card */}
                <div className="glass-panel p-6 rounded-2xl border border-sikai-border/50 bg-gradient-to-br from-white/80 to-white/40 dark:from-[#1a1d24]/80 dark:to-[#0f1115]/40 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(38,216,196,0.15)] transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sikai-cyan/10 rounded-full blur-2xl -mr-10 -mt-10 transition-opacity opacity-50 group-hover:opacity-100"></div>

                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium tracking-wide">TOTAL IVA</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 font-mono tracking-tight">
                                {formatCurrency(stats.totalIva)}
                            </h3>
                        </div>
                        <div className="p-3 bg-sikai-cyan/10 rounded-xl text-sikai-cyan ring-1 ring-sikai-cyan/20 shadow-inner">
                            <Receipt size={20} />
                        </div>
                    </div>
                </div>

                {/* Top Provider Card */}
                <div className="glass-panel p-6 rounded-2xl border border-sikai-border/50 bg-gradient-to-br from-white/80 to-white/40 dark:from-[#1a1d24]/80 dark:to-[#0f1115]/40 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(99,102,241,0.15)] transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-opacity opacity-50 group-hover:opacity-100"></div>

                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium tracking-wide">PROVEEDOR TOP</p>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1 truncate max-w-[140px]" title={stats.topProvider}>
                                {stats.topProvider}
                            </h3>
                        </div>
                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500 ring-1 ring-indigo-500/20 shadow-inner">
                            <ShoppingBag size={20} />
                        </div>
                    </div>
                </div>

                {/* Invoices Count Card */}
                <div className="glass-panel p-6 rounded-2xl border border-sikai-border/50 bg-gradient-to-br from-white/80 to-white/40 dark:from-[#1a1d24]/80 dark:to-[#0f1115]/40 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(236,72,153,0.15)] transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-opacity opacity-50 group-hover:opacity-100"></div>

                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium tracking-wide">FACTURAS</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 font-mono tracking-tight">{stats.scanCount}</h3>
                        </div>
                        <div className="p-3 bg-pink-500/10 rounded-xl text-pink-500 ring-1 ring-pink-500/20 shadow-inner">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Timeline Area Chart */}
                <div className="glass-panel p-6 rounded-2xl border border-sikai-border/50 bg-gradient-to-b from-white/60 to-white/30 dark:from-[#1a1d24]/60 dark:to-transparent relative">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="w-2 h-6 bg-sikai-primary rounded-full"></span>
                        Histórico de Gastos
                    </h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={stats.timelineData}>
                                <defs>
                                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1a88ff" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#1a88ff" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#6b7280"
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(val) => `$${val / 1000}k`}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-10}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(5, 5, 8, 0.95)',
                                        borderColor: 'rgba(26, 136, 255, 0.3)',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#9ca3af', marginBottom: '0.25rem' }}
                                    formatter={(value: any) => [formatCurrency(Number(value || 0)), 'Monto']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#1a88ff"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorAmount)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Providers Pie Chart */}
                <div className="glass-panel p-6 rounded-2xl border border-sikai-border/50 bg-gradient-to-b from-white/60 to-white/30 dark:from-[#1a1d24]/60 dark:to-transparent relative">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="w-2 h-6 bg-sikai-cyan rounded-full"></span>
                        Top Proveedores
                    </h3>
                    <div style={{ width: '100%', height: 300 }} className="flex items-center justify-center">
                        {stats.providerData.length > 0 ? (
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={stats.providerData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {stats.providerData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(5, 5, 8, 0.9)',
                                            borderColor: 'rgba(38, 216, 196, 0.3)',
                                            color: '#fff',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                        formatter={(value: any) => formatCurrency(Number(value || 0))}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-gray-500 py-10">
                                <p>No hay datos suficientes</p>
                                <p className="text-xs mt-1">Escanea facturas para ver métricas</p>
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center mt-4 px-4">
                        {stats.providerData.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: COLORS[index % COLORS.length], color: COLORS[index % COLORS.length] }}></div>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
