"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InputField from "../../components/ui/InputField";
import Button from "../../components/ui/Button";
import SelectField from "../../components/ui/SelectField";
import { apiClient } from "../../lib/api-client";

interface ValidationErrors {
    email?: string;
    password?: string;
    role?: string;
}

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("developer");
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
        } else if (password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }

        if (!role) {
            newErrors.role = "Please select a role";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setStatus("loading");
        setGlobalError("");

        try {
            const res = await apiClient.post('/auth/register', { email, password, role });
            const data = res.data;

            // Store the User data securely in the browser
            localStorage.setItem("kh_os_user", JSON.stringify(data.user || data));

            // NextProxy inherently issued the HttpOnly token invisibly, so bypass client-storage

            // Redirect to the dashboard!
            router.replace("/dashboard");
        } catch (err: any) {
            setStatus("error");

            // 409 = email already in use
            if (err.status === 409 || err.response?.status === 409) {
                setErrors(prev => ({ ...prev, email: "This email address is already registered." }));
                setGlobalError("An account with this email already exists.");
                return;
            }

            // Handle structured backend validation errors (e.g. class-validator arrays)
            const rawMsg = err.response?.data?.message;
            if (rawMsg && Array.isArray(rawMsg)) {
                const backendErrors: ValidationErrors = {};
                rawMsg.forEach((msg: string) => {
                    if (msg.toLowerCase().includes("email")) backendErrors.email = msg;
                    else if (msg.toLowerCase().includes("password")) backendErrors.password = msg;
                    else if (msg.toLowerCase().includes("role")) backendErrors.role = msg;
                    else setGlobalError(msg);
                });
                setErrors(prev => ({ ...prev, ...backendErrors }));
            } else {
                setGlobalError(err.message || "Failed to create account. Please try again.");
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-8">
            <div className="bg-surface/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-zinc-800/60 shadow-2xl max-w-[420px] w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 text-success mb-4">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-textMain tracking-tight">Join the Hub</h1>
                    <p className="text-textMuted text-sm mt-3 leading-relaxed">Create your secure profile and initialize your AI brain.</p>
                </div>

                {globalError && (
                    <div className="mb-6 p-4 rounded-xl text-sm bg-red-500/10 text-red-400 border border-red-500/20 flex items-start">
                        <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{globalError}</span>
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-6" noValidate>
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

                    <SelectField
                        label="Professional Role"
                        value={role}
                        onChange={(e) => {
                            setRole(e.target.value);
                            if (errors.role) setErrors(prev => ({ ...prev, role: undefined }));
                        }}
                        options={[
                            { value: "developer", label: "Software Developer" },
                            { value: "frontend-architect", label: "Frontend Architect" },
                            { value: "product-manager", label: "Product Manager" }
                        ]}
                        error={errors.role}
                        disabled={status === "loading"}
                    />

                    <Button
                        type="submit"
                        disabled={status === "loading"}
                        variant="primary"
                        size="lg"
                        fullWidth
                        className="mt-2 py-3.5 shadow-lg shadow-success/20 bg-success hover:bg-emerald-600"
                    >
                        {status === "loading" ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Encrypting & Registering...
                            </span>
                        ) : "Create Account"}
                    </Button>

                </form>

                <div className="mt-8 text-center text-sm text-textMuted">
                    <span className="mr-1">Already have an account?</span>
                    <Link href="/login" className="text-primary font-medium hover:text-indigo-400 transition-colors">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
