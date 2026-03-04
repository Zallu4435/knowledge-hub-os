"use client";

import { useState } from "react";
import InputField from "../../components/ui/InputField";
import Button from "../../components/ui/Button";
import { apiClient } from "../../lib/api-client";

export default function NetworkPage() {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("developer");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [log, setLog] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setLog("Emitting event to API Gateway...");

        // Constructing the payload that strictly matches our JSON Schema
        const payload = {
            eventId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            data: {
                userId: `frontend_user_${Math.floor(Math.random() * 1000)}`,
                email,
                role,
            },
        };

        try {
            const res = await apiClient.post("/gateway/users", payload);

            setLog(`✅ Success! DB ID: ${res.data.db_id}`);
            setStatus("success");
            setEmail("");
        } catch (err: any) {
            setLog(`❌ Error: ${err.message}`);
            setStatus("error");
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-8 px-4 pb-12">
            <div className="mb-10 text-center">
                <div className="inline-flex items-center justify-center px-4 py-1.5 mb-4 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
                    API Gateway Testing
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-textMain to-zinc-500">
                        Network Onboarding
                    </span>
                </h1>
                <p className="text-lg text-textMuted max-w-lg mx-auto">Create a new mocked user struct strictly triggering the backend polyglot event pipeline.</p>
            </div>

            <div className="bg-surface/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-zinc-800/60 shadow-2xl relative overflow-hidden">
                {/* Decorative glows */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <InputField
                        label="Mock User Email Address"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="test_user@example.com"
                        className="bg-background/80"
                    />

                    <InputField
                        label="Mock System Role"
                        type="text"
                        required
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g. Senior DevOps Engineer"
                        className="bg-background/80"
                    />

                    <Button
                        type="submit"
                        disabled={status === "loading"}
                        variant="primary"
                        size="lg"
                        fullWidth
                        className="mt-2 py-3.5 shadow-lg shadow-primary/20"
                    >
                        {status === "loading" ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Emitting Event...
                            </span>
                        ) : "Onboard Mock User"}
                    </Button>
                </form>

                {log && (
                    <div className={`mt-8 p-4 rounded-xl text-sm border flex items-start relative z-10 transition-all ${status === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-success/5 text-success border-success/20 shadow-inner'}`}>
                        {status === 'error' ? (
                            <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        <span className="font-mono text-[13px]">{log}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
