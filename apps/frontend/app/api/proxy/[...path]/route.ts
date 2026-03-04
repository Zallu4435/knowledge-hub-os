/**
 * Next.js Server-Side BFF Proxy
 *
 * Routes client requests to the correct backend microservice using the
 * SERVICE_URLS registry (driven by NEXT_PUBLIC_* environment variables).
 * No service URLs are hardcoded — all are resolved from environment.
 *
 * URL pattern: /api/proxy/<service>/<rest-of-path>
 * e.g.:  /api/proxy/auth/login   → AUTH_SERVICE/auth/login
 *        /api/proxy/goals        → GOAL_SERVICE/goals
 *        /api/proxy/insights     → AI_SERVICE/insights
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SERVICE_URLS, ServiceKey } from "../../../../lib/api-client";

async function handleProxy(req: NextRequest) {
    const pathnamePrefix = "/api/proxy/";
    if (!req.nextUrl.pathname.startsWith(pathnamePrefix)) {
        return NextResponse.json({ error: "Invalid proxy route" }, { status: 400 });
    }

    const pathSegments = req.nextUrl.pathname.replace(pathnamePrefix, "").split("/");
    const service = pathSegments[0] as ServiceKey;

    if (!SERVICE_URLS[service]) {
        return NextResponse.json({ error: `Service '${service}' not configured` }, { status: 404 });
    }

    // ── Special case: client-side logout (clears cookie) ────────────────────
    // The actual token blacklisting is handled by the AuthService via the guard.
    if (service === "auth" && pathSegments[1] === "logout") {
        // Forward the logout request to the Auth Service so it can blacklist the token
        const cookieStore = await cookies();
        const token = cookieStore.get("kh_os_token")?.value;

        if (token) {
            try {
                const authLogoutUrl = `${SERVICE_URLS.auth}/auth/logout`;
                await fetch(authLogoutUrl, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    cache: "no-store",
                });
            } catch {
                // Best-effort — still clear the cookie even if the service is down
            }
        }

        const response = NextResponse.json({ success: true, message: "Logged out" });
        response.cookies.delete("kh_os_token");
        return response;
    }

    // ── Reconstruct the target URL ───────────────────────────────────────────
    const targetUrl = new URL(
        `/${pathSegments.join("/")}${req.nextUrl.search}`,
        SERVICE_URLS[service],
    ).toString();

    // ── Build forwarding headers (only safe ones) ────────────────────────────
    const headers = new Headers();
    req.headers.forEach((value, key) => {
        if (["content-type", "accept"].includes(key.toLowerCase())) {
            headers.set(key, value);
        }
    });

    // 🔒 Extract HttpOnly cookie → inject as Bearer token for microservice auth
    const cookieStore = await cookies();
    const token = cookieStore.get("kh_os_token")?.value;
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    // ── Read request body (non-GET) ──────────────────────────────────────────
    let body: string | null = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
        try {
            body = await req.text();
            if (!body) body = null;
        } catch { }
    }

    // ── Forward to upstream microservice ────────────────────────────────────
    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers,
            body,
            cache: "no-store",
        });

        const responseText = await response.text();
        let parsedData: unknown = {};
        if (responseText) {
            try {
                parsedData = JSON.parse(responseText);
            } catch {
                parsedData = { data: responseText };
            }
        }

        const proxyResponse = NextResponse.json(parsedData, {
            status: response.status,
            statusText: response.statusText,
        });

        // 🔒 On successful auth responses: inject the access_token as an HttpOnly cookie
        if (
            service === "auth" &&
            (pathSegments[1] === "login" || pathSegments[1] === "register") &&
            response.ok
        ) {
            const data = parsedData as Record<string, unknown>;
            if (data?.access_token) {
                proxyResponse.cookies.set({
                    name: "kh_os_token",
                    value: data.access_token as string,
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 86400, // 24 hours
                    path: "/",
                });
            }
        }

        // 🔒 If upstream returns 401 on a protected route → clear the stale/revoked cookie
        // This keeps the browser session in sync with the Redis blacklist on the backend.
        const isAuthRoute = service === "auth" &&
            (pathSegments[1] === "login" || pathSegments[1] === "register");
        if (response.status === 401 && !isAuthRoute) {
            proxyResponse.cookies.delete("kh_os_token");
        }

        return proxyResponse;
    } catch {
        return NextResponse.json({ error: "Upstream service proxy failed" }, { status: 502 });
    }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
