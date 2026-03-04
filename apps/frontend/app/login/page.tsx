"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InputField from "../../components/ui/InputField";
import Button from "../../components/ui/Button";
import { apiClient } from "../../lib/api-client";

interface ValidationErrors {
    email?: string;
    password?: string;
}

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
    const [globalError, setGlobalError] = useState("");
    const [errors, setErrors] = useState<ValidationErrors>({});

    const validateForm = () => {
        const newErrors: ValidationErrors = {};
        if (!email.trim()) {
            newErrors.email = "Email address is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = "Please enter a valid email address";
        }

        if (!password) {
            newErrors.password = "Password is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setStatus("loading");
        setGlobalError("");

        try {
            const res = await apiClient.post('/auth/login', { email, password });
            const data = res.data;

            // Only store user info on the client side, NOT the JWT!
            localStorage.setItem("kh_os_user", JSON.stringify(data.user || data));

            // Proxy automatically injected HttpOnly session cookie into the browser securely

            // Redirect to the dashboard!
            router.replace("/dashboard");
        } catch (err: any) {
            setStatus("error");

            // 401 = wrong credentials — show a direct, clean message without refreshing
            if (err.status === 401 || err.response?.status === 401) {
                setGlobalError("Incorrect email or password. Please try again.");
                return;
            }

            // Handle structured backend validation errors (e.g. class-validator arrays)
            const rawMsg = err.response?.data?.message;
            if (rawMsg && Array.isArray(rawMsg)) {
                const backendErrors: ValidationErrors = {};
                rawMsg.forEach((msg: string) => {
                    if (msg.toLowerCase().includes("email")) backendErrors.email = msg;
                    else if (msg.toLowerCase().includes("password")) backendErrors.password = msg;
                    else setGlobalError(msg);
                });
                setErrors(prev => ({ ...prev, ...backendErrors }));
            } else {
                setGlobalError(err.message || "An unexpected error occurred. Please try again.");
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-8">
            <div className="bg-surface/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-zinc-800/60 shadow-2xl max-w-[420px] w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-textMain tracking-tight">Welcome Back</h1>
                    <p className="text-textMuted text-sm mt-3 leading-relaxed">Sign in to access your Workspace and AI insights.</p>
                </div>

                {globalError && (
                    <div className="mb-6 p-4 rounded-xl text-sm bg-red-500/10 text-red-400 border border-red-500/20 flex items-start">
                        <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{globalError}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6" noValidate>
                    <InputField
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                        }}
                        placeholder="you@example.com"
                        error={errors.email}
                        disabled={status === "loading"}
                    />

                    <InputField
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                        }}
                        placeholder="••••••••"
                        error={errors.password}
                        disabled={status === "loading"}
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
                                Authenticating...
                            </span>
                        ) : "Sign In to OS"}
                    </Button>
                </form>

                <div className="mt-8 text-center text-sm text-textMuted">
                    <span className="mr-1">Don't have an account?</span>
                    <Link href="/register" className="text-primary font-medium hover:text-indigo-400 transition-colors">
                        Create one now
                    </Link>
                </div>
            </div>
        </div>
    );
}
