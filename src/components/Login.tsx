import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            let result;
            if (isSignUp) {
                result = await supabase.auth.signUp({
                    email,
                    password,
                });
            } else {
                result = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
            }

            if (result.error) throw result.error;

            if (isSignUp) {
                setMessage('Cuenta creada. ¡Ahora puedes iniciar sesión!');
                setIsSignUp(false);
            }

        } catch (error: any) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full px-4 py-8">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-sikai-dark to-sikai-accent left-0"></div>

                <div className="flex justify-center mb-6">
                    <img src="/sikai-logo.png" alt="Sikai Logo" className="h-24 w-24 object-contain rounded-full border-2 border-sikai-accent/50 shadow-[0_0_20px_rgba(26,136,255,0.4)] p-1 bg-black/40 backdrop-blur-sm" />
                </div>
                <h2 className="text-3xl font-headline font-bold text-white mb-2">Bienvenido a SIKAI</h2>
                <p className="text-gray-400 mb-8">Inicia sesión para gestionar tus facturas</p>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-left text-sm font-medium text-gray-300 mb-1">Email Corporativo</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-sikai-accent focus:border-transparent outline-none transition-all"
                            placeholder="usuario@empresa.com"
                        />
                    </div>

                    <div>
                        <label className="block text-left text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-sikai-accent focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>

                    {message && (
                        <div className={`text-sm p-3 rounded ${message.includes('success') || message.includes('creada') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-sikai-accent hover:bg-sikai-secondary text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-800">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                        {isSignUp ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}
                    </button>
                </div>
            </div>
        </div>
    );
}
