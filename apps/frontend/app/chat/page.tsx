"use client";

import { useState } from "react";
import Button from "../../components/ui/Button";
import { apiClient } from "../../lib/api";

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
        <div className="max-w-3xl mx-auto mt-10 h-[80vh] flex flex-col bg-surface border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 bg-background/50 flex items-center">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse mr-3"></div>
                <h2 className="font-bold text-lg text-textMain">Knowledge Hub OS Assistant</h2>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                    <div className="text-center text-zinc-500 mt-20">
                        Ask me about your past goals, completed tasks, or what you should focus on next!
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-primary text-white rounded-br-none'
                                    : 'bg-background border border-zinc-800 text-textMain rounded-bl-none'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-background border border-zinc-800 text-zinc-400 p-4 rounded-2xl rounded-bl-none text-sm animate-pulse">
                            Searching your history...
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-zinc-800 bg-background/50">
                <form onSubmit={sendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="e.g., Based on my recent tasks, what should I learn next?"
                        className="flex-1 bg-background border border-zinc-800 rounded-xl px-4 py-3 text-textMain focus:outline-none focus:border-primary"
                    />
                    <Button
                        type="submit"
                        disabled={isLoading}
                        variant="primary"
                        className="px-6 rounded-xl"
                    >
                        Send
                    </Button>
                </form>
            </div>
        </div>
    );
}
