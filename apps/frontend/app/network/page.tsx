"use client";

import { useState } from "react";

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
            const res = await fetch("http://localhost:3000/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Gateway rejected the payload");

            const data = await res.json();
            setLog(`✅ Success! DB ID: ${data.db_id}`);
            setStatus("success");
            setEmail("");
        } catch (err: any) {
            setLog(`❌ Error: ${err.message}`);
            setStatus("error");
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-20">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-textMain mb-2">Network Onboarding</h1>
                <p className="text-textMuted">Create a new user to trigger the polyglot event pipeline.</p>
            </div>

            <div className="bg-surface p-8 rounded-2xl border border-zinc-800 shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-2">User Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-background border border-zinc-800 rounded-lg px-4 py-3 text-textMain focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                            placeholder="akash@knowledgehub.os"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-2">System Role</label>
                        <input
                            type="text"
                            required
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full bg-background border border-zinc-800 rounded-lg px-4 py-3 text-textMain focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                            placeholder="e.g. Senior DevOps Engineer"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={status === "loading"}
                        className="w-full bg-primary hover:bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {status === "loading" ? "Processing..." : "Onboard User"}
                    </button>
                </form>

                {log && (
                    <div className={`mt-6 p-4 rounded-lg text-sm ${status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-success/10 text-success border border-success/20'}`}>
                        {log}
                    </div>
                )}
            </div>
        </div>
    );
}
