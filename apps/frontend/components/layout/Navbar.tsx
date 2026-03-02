import Link from 'next/link';
import SignOutButton from '../SignOutButton';

interface NavbarProps {
    isLoggedIn: boolean;
}

export default function Navbar({ isLoggedIn }: NavbarProps) {
    return (
        <nav className="border-b border-zinc-800 bg-surface/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

                {/* Logo & Brand */}
                <Link href="/" className="flex items-center space-x-3 group">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white shadow-lg group-hover:bg-indigo-400 transition-colors">
                        K
                    </div>
                    <span className="font-bold text-lg tracking-tight text-white">
                        Knowledge Hub OS
                    </span>
                </Link>

                {/* Navigation Links */}
                <div className="flex space-x-2 text-sm font-medium items-center">
                    <Link
                        href="/dashboard"
                        className="px-4 py-2 rounded-md text-textMuted hover:text-textMain hover:bg-zinc-800 transition-all"
                    >
                        Workspace
                    </Link>
                    <Link
                        href="/insights"
                        className="px-4 py-2 rounded-md text-textMuted hover:text-textMain hover:bg-zinc-800 transition-all"
                    >
                        AI Intelligence Feed
                    </Link>
                    <Link
                        href="/chat"
                        className="px-4 py-2 rounded-md text-primary font-bold hover:bg-zinc-800 transition-all"
                    >
                        Chat with AI
                    </Link>

                    <div className="h-4 w-px bg-zinc-700 mx-2"></div>
                    {isLoggedIn ? (
                        <SignOutButton />
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="px-4 py-2 rounded-md text-textMuted hover:text-textMain transition-all"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/register"
                                className="px-4 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                            >
                                Create Account
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
