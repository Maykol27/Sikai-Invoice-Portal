import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";

export function Pricing() {
    const [credits, setCredits] = useState(0);

    useEffect(() => {
        fetchCredits();
    }, []);

    const fetchCredits = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase.from('users_credits').select('credits').eq('user_id', user.id).single();
        if (data) setCredits(data.credits);
    };



    return (
        <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-3xl font-headline font-bold text-white">Recargar Créditos</h2>
            <p className="text-gray-400">Saldo actual: <span className="text-sikai-accent font-bold text-xl">{credits}</span> créditos</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <div className="glass-panel p-8 rounded-xl border-sikai-accent border relative">
                    <div className="absolute top-0 right-0 bg-sikai-accent text-white text-xs font-bold px-3 py-1 rounded-bl-lg">RECOMENDADO</div>
                    <h3 className="text-2xl font-bold text-white mb-2">Recarga de Saldo</h3>
                    <p className="text-gray-400 mb-6">Contáctanos para adquirir paquetes de escaneos a medida.</p>

                    <a
                        href="mailto:ventas@sikaiconsulting.com?subject=Solicitud de Recarga SIKAI Invoice&body=Hola, deseo recargar mi saldo de créditos."
                        className="block w-full bg-sikai-accent text-white font-bold py-3 rounded-lg hover:bg-sikai-secondary transition-colors"
                    >
                        Contactar Administrador
                    </a>
                </div>

                {/* Another plan placeholder */}
                <div className="glass-panel p-8 rounded-xl opacity-50 cursor-not-allowed">
                    <h3 className="text-2xl font-bold text-white mb-2">Ilimitado</h3>
                    <p className="text-sm text-gray-400">Próximamente</p>
                </div>
            </div>
        </div>
    );
}
