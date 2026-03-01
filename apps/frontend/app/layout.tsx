import './globals.css'
import Link from 'next/link'

export const metadata = {
    title: 'Knowledge Hub OS',
    description: 'AI-Powered Career & Productivity Engine',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-background text-textMain antialiased flex flex-col">
                {/* Global Navigation Bar */}
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
                        <div className="flex space-x-2 text-sm font-medium">
                            <Link
                                href="/network"
                                className="px-4 py-2 rounded-md text-textMuted hover:text-textMain hover:bg-zinc-800 transition-all"
                            >
                                Network Onboarding
                            </Link>
                            <Link
                                href="/insights"
                                className="px-4 py-2 rounded-md text-textMuted hover:text-textMain hover:bg-zinc-800 transition-all"
                            >
                                AI Intelligence Feed
                            </Link>
                        </div>

                    </div>
                </nav>

                {/* Page Content */}
                <main className="flex-1 max-w-7xl mx-auto p-6 w-full">
                    {children}
                </main>
            </body>
        </html>
    )
}
