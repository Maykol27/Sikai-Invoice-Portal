import { X, Send, Mic, Loader2, Brain } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    type: 'text' | 'voice';
}

interface SikaiBrainChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSendMessage: (message: string, type: 'text' | 'voice') => Promise<void>;
    messages: ChatMessage[];
    isProcessing: boolean;
    invoiceData: any;
}

export function SikaiBrainChatModal({
    isOpen,
    onClose,
    onSendMessage,
    messages,
    isProcessing,
    invoiceData
}: SikaiBrainChatModalProps) {
    const [inputValue, setInputValue] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        try {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            if (messages.length > 0) {
                console.log('[SikaiBrainChat] Auto-scrolled to latest message, total:', messages.length);
            }
        } catch (error) {
            console.error('[SikaiBrainChat] Auto-scroll error:', error);
        }
    }, [messages]);

    // Cleanup speech recognition on unmount
    useEffect(() => {
        console.log('[SikaiBrainChat] Component mounted');
        return () => {
            console.log('[SikaiBrainChat] Component unmounting, cleaning up');
            try {
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                    console.log('[SikaiBrainChat] Speech recognition stopped');
                }
            } catch (error) {
                console.error('[SikaiBrainChat] Cleanup error:', error);
            }
        };
    }, []);

    const handleSendText = async () => {
        if (!inputValue.trim() || isProcessing) return;

        const message = inputValue.trim();
        console.log('[SikaiBrainChat] Sending text message:', message);
        setInputValue('');

        try {
            await onSendMessage(message, 'text');
            console.log('[SikaiBrainChat] Text message sent successfully');
        } catch (error) {
            console.error('[SikaiBrainChat] Failed to send text message:', error, { message });
            // Error is already handled in parent component (ResultViewer)
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendText();
        }
    };

    const handleVoiceClick = () => {
        if (isRecording) {
            console.log('[SikaiBrainChat] Stopping voice recording');
            try {
                recognitionRef.current?.stop();
                setIsRecording(false);
            } catch (error) {
                console.error('[SikaiBrainChat] Error stopping voice recording:', error);
                setIsRecording(false);
            }
            return;
        }

        console.log('[SikaiBrainChat] Starting voice recording');
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            const errorMsg = "Tu navegador no soporta comandos de voz. Intenta con Chrome o Edge.";
            console.error('[SikaiBrainChat] Speech recognition not supported');
            alert(errorMsg);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognitionRef.current = recognition;
            recognition.lang = 'es-CO';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => {
                console.log('[SikaiBrainChat] Voice recording started');
                setIsRecording(true);
            };

            recognition.onresult = async (event: any) => {
                const transcript = event.results[0][0].transcript;
                console.log('[SikaiBrainChat] Voice transcript received:', transcript);
                setIsRecording(false);

                if (transcript.trim().length > 0) {
                    try {
                        await onSendMessage(transcript, 'voice');
                        console.log('[SikaiBrainChat] Voice message sent successfully');
                    } catch (error) {
                        console.error('[SikaiBrainChat] Failed to send voice message:', error, { transcript });
                    }
                } else {
                    console.warn('[SikaiBrainChat] Empty voice transcript received');
                }
            };

            recognition.onerror = (event: any) => {
                console.error('[SikaiBrainChat] Voice recognition error:', event.error, event);
                setIsRecording(false);

                // User-friendly error messages
                const errorMessages: Record<string, string> = {
                    'no-speech': 'No se detectó voz. Intenta de nuevo.',
                    'network': 'Error de red. Verifica tu conexión.',
                    'not-allowed': 'Permiso denegado. Permite el acceso al micrófono.',
                    'aborted': 'Grabación cancelada.',
                };

                const userMessage = errorMessages[event.error] || `Error: ${event.error}`;
                alert(userMessage);
            };

            recognition.onend = () => {
                console.log('[SikaiBrainChat] Voice recording ended');
                setIsRecording(false);
            };

            recognition.start();
        } catch (error) {
            console.error('[SikaiBrainChat] Failed to initialize voice recognition:', error);
            alert('Error al iniciar grabación de voz. Intenta nuevamente.');
            setIsRecording(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={cn(
                "fixed z-50 bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl",
                "rounded-2xl shadow-2xl border border-sikai-accent/30",
                "flex flex-col overflow-hidden",
                "animate-in slide-in-from-bottom-4 fade-in duration-300",
                // Desktop: bottom-right corner
                "md:bottom-24 md:right-6 md:w-[420px] md:h-[600px] md:max-h-[80vh]",
                // Mobile: full screen
                "bottom-0 left-0 right-0 top-0 md:top-auto md:left-auto"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-gradient-to-r from-sikai-primary/10 to-sikai-accent/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-sikai-accent/20 rounded-lg">
                            <Brain className="w-5 h-5 text-sikai-accent" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Asistente SIKAI</h3>
                            <p className="text-xs text-gray-400">
                                {invoiceData?.provider_name || 'Listo para ayudar'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 mt-8">
                            <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">👋 ¡Hola! Soy tu agente SIKAI.</p>
                            <p className="text-xs mt-2 opacity-70">
                                Escribe o graba un comando para ajustar la factura.
                            </p>
                            <div className="mt-4 text-xs text-left bg-white/5 p-3 rounded-lg max-w-xs mx-auto">
                                <p className="font-semibold mb-1">Ejemplos:</p>
                                <ul className="space-y-1 opacity-80">
                                    <li>• "Cambia el precio de X a 5000"</li>
                                    <li>• "Aumenta el IVA al 19%"</li>
                                    <li>• "La cerveza es un sixpack"</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex gap-2 animate-in slide-in-from-bottom-2 fade-in",
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                            <div
                                className={cn(
                                    "max-w-[80%] rounded-xl px-4 py-2 text-sm",
                                    message.role === 'user'
                                        ? "bg-gradient-to-br from-sikai-primary to-sikai-accent text-white"
                                        : message.role === 'assistant'
                                            ? "bg-white/10 text-gray-200 border border-white/10"
                                            : "bg-yellow-500/20 text-yellow-200 border border-yellow-500/30"
                                )}
                            >
                                {message.type === 'voice' && message.role === 'user' && (
                                    <div className="flex items-center gap-1 text-xs opacity-80 mb-1">
                                        <Mic className="w-3 h-3" />
                                        <span>Voz</span>
                                    </div>
                                )}
                                <p className="whitespace-pre-wrap">{message.content}</p>
                                <p className="text-xs opacity-60 mt-1">
                                    {message.timestamp.toLocaleTimeString('es-CO', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isProcessing && (
                        <div className="flex gap-2 justify-start animate-in slide-in-from-bottom-2 fade-in">
                            <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center gap-2 border border-white/10">
                                <Loader2 className="w-4 h-4 animate-spin text-sikai-accent" />
                                <span className="text-sm text-gray-300">AI está pensando...</span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-700/50 bg-black/40">
                    <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Escribe un comando..."
                                disabled={isProcessing}
                                className={cn(
                                    "w-full bg-white/5 border border-gray-600 rounded-xl px-4 py-3 pr-12",
                                    "text-white placeholder:text-gray-500 resize-none",
                                    "focus:outline-none focus:border-sikai-accent focus:ring-2 focus:ring-sikai-accent/20",
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                    "scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent",
                                    "max-h-24"
                                )}
                                rows={1}
                                style={{
                                    minHeight: '44px',
                                    height: 'auto'
                                }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = '44px';
                                    target.style.height = Math.min(target.scrollHeight, 96) + 'px';
                                }}
                            />
                        </div>

                        {/* Voice Button */}
                        <button
                            type="button"
                            onClick={handleVoiceClick}
                            disabled={isProcessing}
                            className={cn(
                                "p-3 rounded-xl transition-all duration-200 flex-shrink-0",
                                isRecording
                                    ? "bg-red-500 text-white animate-pulse"
                                    : "bg-sikai-accent/20 text-sikai-accent hover:bg-sikai-accent hover:text-black",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                            title={isRecording ? "Grabando... (Click para detener)" : "Grabar comando de voz"}
                        >
                            <Mic className="w-5 h-5" />
                        </button>

                        {/* Send Button */}
                        <button
                            type="button"
                            onClick={handleSendText}
                            disabled={!inputValue.trim() || isProcessing}
                            className={cn(
                                "p-3 rounded-xl transition-all duration-200 flex-shrink-0",
                                "bg-gradient-to-br from-sikai-primary to-sikai-accent text-white",
                                "hover:shadow-lg hover:shadow-sikai-accent/20 hover:scale-105",
                                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                            )}
                            title="Enviar mensaje"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>

                    {isRecording && (
                        <div className="mt-2 flex items-center gap-2 text-red-400 text-xs animate-in fade-in">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            Escuchando... Habla ahora
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
