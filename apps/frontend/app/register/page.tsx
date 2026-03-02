"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InputField from "../../components/ui/InputField";
import Button from "../../components/ui/Button";
import SelectField from "../../components/ui/SelectField";
import { apiClient } from "../../lib/api";

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("developer");
    const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setErrorMsg("");

        try {
            const res = await apiClient.post('/auth/register', { email, password, role });
            const data = res.data;

            // Store the User data securely in the browser
            localStorage.setItem("kh_os_user", JSON.stringify(data.user));

            // NextProxy inherently issued the HttpOnly token invisibly, so bypass client-storage

            // Redirect to the dashboard!
            router.push("/dashboard");
        } catch (err: any) {
            setErrorMsg(err.message);
            setStatus("error");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[75vh]">
            <div className="bg-surface p-8 rounded-2xl border border-zinc-800 shadow-xl max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-textMain mb-2">Join the Hub</h1>
                    <p className="text-textMuted text-sm">Create your secure profile and initialize your AI brain.</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                    <InputField
                        label="Email"
                        type="email" required
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                    />

                    <InputField
                        label="Password"
                        type="password" required minLength={6}
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />

                    <SelectField
                        label="Role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        options={[
                            { value: "developer", label: "Software Developer" },
                            { value: "frontend-architect", label: "Frontend Architect" },
                            { value: "product-manager", label: "Product Manager" }
                        ]}
                    />

                    <Button
                        type="submit"
                        disabled={status === "loading"}
                        variant="primary"
                        size="lg"
                        fullWidth
                        className="mt-4"
                    >
                        {status === "loading" ? "Encrypting & Registering..." : "Create Account"}
                    </Button>

                </form>

                {status === "error" && (
                    <div className="mt-4 p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20 text-center">
                        {errorMsg}
                    </div>
                )}

                <div className="mt-6 text-center text-sm text-textMuted">
                    Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
