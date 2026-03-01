export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="bg-surface p-10 rounded-2xl border border-zinc-800 shadow-xl max-w-lg w-full text-center">
                <h1 className="text-4xl font-bold mb-4 text-primary">Knowledge Hub OS</h1>
                <p className="text-textMuted mb-8">Frontend Monorepo Integration Successful.</p>

                <div className="flex items-center justify-center space-x-3 text-sm">
                    <span className="flex items-center px-3 py-1 bg-zinc-800 rounded-full text-zinc-300">
                        <span className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse"></span>
                        Strict TypeScript Contracts
                    </span>
                    <span className="flex items-center px-3 py-1 bg-zinc-800 rounded-full text-zinc-300">
                        <span className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse"></span>
                        Bazel Sandboxed
                    </span>
                </div>
            </div>
        </div>
    )
}
