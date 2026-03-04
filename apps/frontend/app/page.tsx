import Link from 'next/link';

export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-12">
            <div className="text-center max-w-4xl w-full">
                {/* Badge */}
                <div className="inline-flex items-center justify-center px-4 py-1.5 mb-8 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse"></span>
                    Systems Online & Operational
                </div>

                {/* Main Heading */}
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
                    <span className="block text-textMain mb-2">Welcome to your</span>
                    <span className="block bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-400 to-purple-400">
                        Knowledge Hub OS
                    </span>
                </h1>

                {/* Subtext */}
                <p className="text-lg md:text-xl text-textMuted mb-10 max-w-2xl mx-auto leading-relaxed">
                    The next-generation, AI-driven productivity brain. Manage your goals, connect your thoughts, and receive intelligent insights instantly—all powered by a blazing-fast microservice architecture.
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/register"
                        className="w-full sm:w-auto px-8 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-indigo-500 transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5"
                    >
                        Start for Free
                    </Link>
                    <Link
                        href="/login"
                        className="w-full sm:w-auto px-8 py-3.5 bg-surface text-textMain border border-zinc-700/50 rounded-xl font-semibold hover:bg-zinc-800 transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                        Sign In to Account
                    </Link>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
                    <div className="bg-surface/50 p-6 rounded-2xl border border-zinc-800/50 hover:border-primary/30 transition-all duration-300 group">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                            <span className="text-2xl">🧠</span>
                        </div>
                        <h3 className="text-lg font-bold text-textMain mb-2">AI-Powered Insights</h3>
                        <p className="text-textMuted text-sm leading-relaxed">Let our Gemini engine analyze your goals and tasks in real-time, providing proactive coaching and intelligence.</p>
                    </div>

                    <div className="bg-surface/50 p-6 rounded-2xl border border-zinc-800/50 hover:border-primary/30 transition-all duration-300 group">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                            <span className="text-2xl">⚡</span>
                        </div>
                        <h3 className="text-lg font-bold text-textMain mb-2">Event-Driven Flow</h3>
                        <p className="text-textMuted text-sm leading-relaxed">A lightning-fast, decoupled microservice backend built for extreme scale with high-availability message brokers.</p>
                    </div>

                    <div className="bg-surface/50 p-6 rounded-2xl border border-zinc-800/50 hover:border-primary/30 transition-all duration-300 group">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                            <span className="text-2xl">🛡️</span>
                        </div>
                        <h3 className="text-lg font-bold text-textMain mb-2">Secure by Default</h3>
                        <p className="text-textMuted text-sm leading-relaxed">Enterprise-grade JWT authentication and secure Next.js HTTP-only proxy routing protect your data at every single layer.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
