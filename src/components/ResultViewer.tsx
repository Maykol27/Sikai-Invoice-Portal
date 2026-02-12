import { Download, CheckCircle, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ResultViewerProps {
    data: any;
    onReset: () => void;
}

export function ResultViewer({ data, onReset }: ResultViewerProps) {

    const handleExport = (type: 'csv' | 'json') => {
        if (type === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `factura_${data.date || 'scan'}.json`;
            a.click();
        } else if (type === 'csv') {
            const ws = XLSX.utils.json_to_sheet([data]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Factura");
            XLSX.writeFile(wb, `factura_${data.date || 'scan'}.csv`);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={onReset}
                    className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Escanear otra
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleExport('csv')}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        CSV
                    </button>
                    <button
                        onClick={() => handleExport('json')}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        JSON
                    </button>
                </div>
            </div>

            <div className="glass-panel p-8 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sikai-dark to-sikai-accent"></div>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Extracción Exitosa</h2>
                        <p className="text-gray-400 text-sm">Los datos han sido procesados por Gemini AI</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(data).map(([key, value]) => (
                        <div key={key} className="bg-white/5 p-4 rounded-lg border border-white/10">
                            <span className="text-xs text-sikai-accent uppercase font-bold tracking-wider block mb-1">
                                {key.replace(/_/g, ' ')}
                            </span>
                            <span className="text-lg text-white font-medium break-all">
                                {String(value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
