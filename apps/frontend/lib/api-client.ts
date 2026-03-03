/**
 * api-client.ts — Centralized API Client for Knowledge Hub OS
 *
 * All service URLs are loaded from Next.js environment variables so that the
 * frontend never has hardcoded localhost addresses. Backend URLs are set via
 * NEXT_PUBLIC_* env vars and the proxy route.ts reads server-side env vars.
 *
 * Usage (client components):
 *   import { apiClient } from '@/lib/api-client';
 *   const res = await apiClient.get('/goals');             // → goal-service
 *   const res = await apiClient.post('/auth/login', body); // → auth-service
 *
 * All requests go through the Next.js server-side proxy (/api/proxy/[...path])
 * which secures HttpOnly cookies and prevents CORS issues.
 */

import axios, { AxiosInstance } from 'axios';

// ─── Service URL Registry (consumed by the server-side proxy) ────────────────
// These are read by route.ts at runtime — they are NOT exposed to the browser.
export const SERVICE_URLS = {
    auth: process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001',
    goals: process.env.NEXT_PUBLIC_GOAL_SERVICE_URL || 'http://localhost:3002',
    gateway: process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000',
    insights: process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000',
} as const;

export type ServiceKey = keyof typeof SERVICE_URLS;

// ─── Axios Client (all requests go through the Next.js BFF proxy) ────────────
function createApiClient(): AxiosInstance {
    const instance = axios.create({
        // Route all API calls through the Next.js server-side proxy
        baseURL: '/api/proxy',
        withCredentials: true, // Sends the HttpOnly kh_os_token cookie automatically
        headers: { 'Content-Type': 'application/json' },
    });

    // ── Response Interceptor ─────────────────────────────────────────────────
    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            // Handle 401 globally — session expired or token revoked (logged out)
            if (error.response?.status === 401 && typeof window !== 'undefined') {
                localStorage.removeItem('kh_os_user');
                window.location.href = '/login';
            }

            // Normalise the error message for UI consumption
            const message =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'An unexpected API error occurred';

            return Promise.reject(new Error(message));
        },
    );

    return instance;
}

export const apiClient = createApiClient();
