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

import axios, { AxiosInstance, AxiosError } from 'axios';

// ─── Service URL Registry (consumed by the server-side proxy) ────────────────
// These are read by route.ts at runtime — they are NOT exposed to the browser.
export const SERVICE_URLS = {
    auth: process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001',
    goals: process.env.NEXT_PUBLIC_GOAL_SERVICE_URL || 'http://localhost:3002',
    gateway: process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000',
    insights: process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000',
} as const;

export type ServiceKey = keyof typeof SERVICE_URLS;

// Auth routes that are expected to return 401 on bad credentials.
// These should NEVER trigger a global session redirect.
const AUTH_ROUTES = ['/auth/login', '/auth/register'];

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
        (error: AxiosError) => {
            const requestUrl = error.config?.url || '';

            // ── Global 401 handler (session expiry / revoked token) ───────────
            // NEVER redirect on auth routes — a bad password returns 401 legitimately.
            const isAuthRoute = AUTH_ROUTES.some(route => requestUrl.includes(route));

            if (error.response?.status === 401 && !isAuthRoute && typeof window !== 'undefined') {
                localStorage.removeItem('kh_os_user');
                // Use replace so the browser back-button doesn't return to a broken page
                window.location.replace('/login');
                // Return a never-resolving promise so no further error handling runs
                return new Promise(() => { });
            }

            // ── Normalise the error — keep the original AxiosError so that
            // callers can inspect err.response?.data for structured backend errors.
            // We attach a friendly .message but preserve the full response.
            const serverMessage =
                (error.response?.data as any)?.message ||
                (error.response?.data as any)?.error ||
                error.message ||
                'An unexpected API error occurred';

            // Re-attach response so callers can still inspect err.response?.data
            const enrichedError: any = new Error(
                Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage,
            );
            enrichedError.response = error.response;
            enrichedError.status = error.response?.status;

            return Promise.reject(enrichedError);
        },
    );

    return instance;
}

export const apiClient = createApiClient();

