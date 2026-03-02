import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Check for the token in the cookies
    const token = request.cookies.get('kh_os_token')?.value;

    // The routes we want to protect
    const isProtectedRoute = request.nextUrl.pathname.startsWith('/insights') ||
        request.nextUrl.pathname.startsWith('/network') ||
        request.nextUrl.pathname.startsWith('/dashboard');

    // If trying to access a protected route without a token, redirect to login
    if (isProtectedRoute && !token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // If they have a token and try to go to login/register, send them to insights
    const isAuthRoute = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register';
    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

// Specify exactly which paths this middleware should run on
export const config = {
    matcher: ['/insights', '/network', '/login', '/register', '/dashboard'],
};
