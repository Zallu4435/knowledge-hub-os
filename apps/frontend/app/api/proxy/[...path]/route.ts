import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const SERVICE_MAP: Record<string, string> = {
    auth: "http://localhost:3001",
    goals: "http://localhost:3002",
    insights: "http://localhost:8000",
    gateway: "http://localhost:3000",
};

async function handleProxy(req: NextRequest) {
    // Parse the proxied path safely. e.g. /api/proxy/auth/login -> ['auth', 'login']
    const pathnamePrefix = '/api/proxy/';
    if (!req.nextUrl.pathname.startsWith(pathnamePrefix)) {
        return NextResponse.json({ error: "Invalid proxy route" }, { status: 400 });
    }

    const pathSegments = req.nextUrl.pathname.replace(pathnamePrefix, '').split('/');
    const service = pathSegments[0];

    if (!SERVICE_MAP[service]) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    if (service === "auth" && pathSegments[1] === "logout") {
        const response = NextResponse.json({ success: true });
        response.cookies.delete("kh_os_token");
        return response;
    }

    // Reconstruct target microservice URL
    const targetUrl = new URL(`/${pathSegments.join("/")}${req.nextUrl.search}`, SERVICE_MAP[service]).toString();

    // Prepare clean headers for internal forwarding
    const headers = new Headers();
    req.headers.forEach((value, key) => {
        if (["content-type", "accept"].includes(key.toLowerCase())) {
            headers.set(key, value);
        }
    });

    // 🔒 Securely extract HttpOnly cookie and attach it as Bearer token for inter-service communication
    const cookieStore = await cookies();
    const token = cookieStore.get("kh_os_token")?.value;

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    // Capture arbitrary payload body for requests other than GET
    let body: string | null = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
        try {
            body = await req.text();
            if (!body) body = null;
        } catch (e) { }
    }

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers,
            body,
            cache: "no-store",
        });

        // Extract response properly
        const responseText = await response.text();
        let parsedData: any = {};
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

        // 🔒 Intercept Auth responses to inject secure, inaccessible HttpOnly Session Cookie!
        if (service === "auth" && (pathSegments[1] === "login" || pathSegments[1] === "register") && response.ok) {
            if (parsedData.access_token) {
                proxyResponse.cookies.set({
                    name: "kh_os_token",
                    value: parsedData.access_token,
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 86400, // 24 hours
                    path: "/",
                });
            }
        }

        return proxyResponse;
    } catch (err: any) {
        return NextResponse.json({ error: "Upstream service proxy failed" }, { status: 502 });
    }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
