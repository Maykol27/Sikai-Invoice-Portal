import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
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

    const handleApprove = async (_data: any, actions: any) => {
        return actions.order.capture().then(async (_details: any) => {
            // Call RPC to add credits
            const { error } = await supabase.rpc('increment_credits', { amount: 10 });
            if (error) {
                alert('Error updating credits');
                console.error(error);
            } else {
                alert('Pago exitoso! Créditos añadidos.');
                fetchCredits();
            }
        });
    };

    return (
        <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-3xl font-headline font-bold text-white">Recargar Créditos</h2>
            <p className="text-gray-400">Saldo actual: <span className="text-sikai-accent font-bold text-xl">{credits}</span> créditos</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <div className="glass-panel p-8 rounded-xl border-sikai-accent border relative">
                    <div className="absolute top-0 right-0 bg-sikai-accent text-black text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
                    <h3 className="text-2xl font-bold text-white mb-2">Paquete Básico</h3>
                    <p className="text-4xl font-bold text-sikai-accent mb-6">$10.00 <span className="text-sm text-gray-500 font-normal">/ 10 escaneos</span></p>

                    <PayPalScriptProvider options={{ clientId: "test" }}>
                        <PayPalButtons
                            style={{ layout: "horizontal" }}
                            createOrder={(_data, actions) => {
                                return actions.order.create({
                                    intent: "CAPTURE",
                                    purchase_units: [{
                                        amount: { value: "10.00", currency_code: "USD" }
                                    }]
                                });
                            }}
                            onApprove={handleApprove}
                        />
                    </PayPalScriptProvider>
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
