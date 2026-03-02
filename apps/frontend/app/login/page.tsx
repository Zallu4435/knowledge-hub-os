"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InputField from "../../components/ui/InputField";
import Button from "../../components/ui/Button";
import { apiClient } from "../../lib/api";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setErrorMsg("");

        try {
            const res = await apiClient.post('/auth/login', { email, password });
            const data = res.data;

            // Only store user info on the client side, NOT the JWT!
            localStorage.setItem("kh_os_user", JSON.stringify(data.user));

            // Proxy automatically injected HttpOnly session cookie into the browser securely

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
                    <h1 className="text-3xl font-bold text-textMain mb-2">Welcome Back</h1>
                    <p className="text-textMuted text-sm">Enter your credentials to access your insights.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <InputField
                        label="Email"
                        type="email" required
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                    />

                    <InputField
                        label="Password"
                        type="password" required
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />

                    <Button
                        type="submit"
                        disabled={status === "loading"}
                        variant="primary"
                        size="lg"
                        fullWidth
                        className="mt-4"
                    >
                        {status === "loading" ? "Authenticating..." : "Sign In"}
                    </Button>
                </form>

                {status === "error" && (
                    <div className="mt-4 p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20 text-center">
                        {errorMsg}
                    </div>
                )}

                <div className="mt-6 text-center text-sm text-textMuted">
                    Don't have an account? <Link href="/register" className="text-primary hover:underline">Sign up</Link>
                </div>
            </div>
        </div>
    );
}
