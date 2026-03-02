"use client";

import { useRouter } from "next/navigation";
import Button from "./ui/Button";
import { apiClient } from "../lib/api";

export default function SignOutButton() {
    const router = useRouter();

    const handleSignOut = async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (e) {
            // Force clean anyway
        } finally {
            localStorage.removeItem("kh_os_user");
            router.push("/login");
            router.refresh();
        }
    };

    return (
        <Button onClick={handleSignOut} variant="danger" size="md">
            Sign Out
        </Button>
    );
}
