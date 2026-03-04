"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";
import { apiClient } from "../lib/api-client";

export default function SignOutButton() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleSignOut = async () => {
        if (isLoading) return; // Prevent double-clicks
        setIsLoading(true);

        try {
            // This hits the proxy → auth-service POST /auth/logout
            // The auth-service's JwtAuthGuard extracts the token from the cookie
            // and adds it to the Redis blacklist so it can never be reused.
            await apiClient.post('/auth/logout');
        } catch {
            // Best-effort: even if the blacklist call fails (e.g. Render cold-start),
            // we still clear the local session so the UI is clean.
        } finally {
            // Always clear local user data
            localStorage.removeItem("kh_os_user");
            // Use replace() so the back-button doesn't return to a protected page
            router.replace("/login");
            router.refresh(); // Force the Navbar's server component to re-evaluate the cookie
        }
    };

    return (
        <Button
            onClick={handleSignOut}
            variant="danger"
            size="md"
            disabled={isLoading}
        >
            {isLoading ? "Signing out..." : "Sign Out"}
        </Button>
    );
}
