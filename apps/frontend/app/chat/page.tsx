"use client";

import { useState } from "react";
import Button from "../../components/ui/Button";
import { apiClient } from "../../lib/api-client";

export default function ChatPage() {
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input;
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setInput("");
        setIsLoading(true);

        try {
            // Securely proxy the request to the AI service (mapped to 'insights' in our proxy map)
            const res = await apiClient.post("/insights/chat", { message: userMessage });

            setMessages(prev => [...prev, { role: 'ai', text: res.data.reply }]);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'ai', text: "❌ Error connecting to AI Brain." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto mt-8 px-4 pb-12">
            <div className="mb-8">
                <div className="inline-flex items-center justify-center px-4 py-1.5 mb-4 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
                    Interactive Intelligence
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 text-textMain">
                    Knowledge Hub <span className="text-primary">Assistant</span>
                </h1>
                <p className="text-textMuted max-w-2xl">Ask questions about your goals, request productivity tips, or brainstorm your next moves.</p>
            </div>

            <div className="h-[65vh] flex flex-col bg-surface/80 backdrop-blur-sm border border-zinc-800/60 rounded-3xl shadow-2xl overflow-hidden relative">
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                {/* Header */}
                <div className="p-5 border-b border-zinc-800/80 bg-background/40 flex items-center justify-between relative z-10">
                    <div className="flex items-center">
                        <div className="relative flex h-3 w-3 mr-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                        </div>
                        <h2 className="font-bold text-textMain tracking-wide">AI Brain Online</h2>
                    </div>
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-2">
                                <span className="text-3xl">🤖</span>
                            </div>
                            <p className="text-center max-w-sm">Ask me about your past goals, completed tasks, or what you should focus on next!</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'ai' && (
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                                        <span className="text-sm">🧠</span>
                                    </div>
                                )}
                                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'bg-primary text-white rounded-br-sm'
                                    : 'bg-background/80 border border-zinc-800 text-textMain rounded-bl-sm backdrop-blur-sm'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex justify-start items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                                <span className="text-sm">🧠</span>
                            </div>
                            <div className="bg-background/80 border border-zinc-800 text-zinc-400 p-4 rounded-2xl rounded-bl-sm text-sm flex items-center space-x-2">
                                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-5 border-t border-zinc-800/80 bg-background/60 relative z-10">
                    <form onSubmit={sendMessage} className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="e.g., Based on my recent tasks, what should I learn next?"
                            className="flex-1 bg-surface border border-zinc-700 rounded-xl px-5 py-3.5 text-textMain focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                        />
                        <Button
                            type="submit"
                            disabled={isLoading}
                            variant="primary"
                            className="px-6 rounded-xl shadow-lg shadow-primary/20"
                        >
                            <svg className="w-5 h-5 ml-1 -mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
