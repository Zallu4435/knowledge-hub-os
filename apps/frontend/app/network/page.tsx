"use client";

import { useState } from "react";
import InputField from "../../components/ui/InputField";
import Button from "../../components/ui/Button";
import { apiClient } from "../../lib/api";

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
        <div className="max-w-2xl mx-auto mt-20">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-textMain mb-2">Network Onboarding</h1>
                <p className="text-textMuted">Create a new user to trigger the polyglot event pipeline.</p>
            </div>

            <div className="bg-surface p-8 rounded-2xl border border-zinc-800 shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <InputField
                        label="User Email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="[EMAIL_ADDRESS]"
                    />

                    <InputField
                        label="System Role"
                        type="text"
                        required
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g. Senior DevOps Engineer"
                    />

                    <Button
                        type="submit"
                        disabled={status === "loading"}
                        variant="primary"
                        size="lg"
                        fullWidth
                    >
                        {status === "loading" ? "Processing..." : "Onboard User"}
                    </Button>
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
