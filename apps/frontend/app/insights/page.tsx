export const dynamic = 'force-dynamic'; // Ensure we always fetch fresh data

export default async function InsightsPage() {
    let insights = [];
    let error = null;

    try {
        // Fetch directly from the FastAPI service (Port 8000)
        const res = await fetch("http://localhost:8000/insights", { cache: 'no-store' });
        if (!res.ok) throw new Error("Failed to fetch from AI Service");
        const data = await res.json();
        insights = data.insights;
    } catch (err: any) {
        error = err.message;
    }

    return (
        <div className="max-w-4xl mx-auto mt-20">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-primary mb-3">AI Intelligence Feed</h1>
                <p className="text-textMuted">Real-time career roadmaps and system analyses from the FastAPI brain.</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center mb-8">
                    Unable to connect to the AI Service Brain: {error}
                </div>
            )}

            <div className="grid gap-6">
                {insights.length === 0 && !error ? (
                    <div className="text-center text-zinc-500 py-10">No insights generated yet. Onboard a user first!</div>
                ) : (
                    insights.map((insight: any) => (
                        <div key={insight._id} className="bg-surface border border-zinc-800 rounded-2xl p-6 shadow-lg hover:border-zinc-700 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-textMain flex items-center">
                                        {insight.userId}
                                        <span className="ml-3 text-xs font-medium px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                                            {insight.role}
                                        </span>
                                    </h3>
                                    <p className="text-sm text-textMuted mt-1">{insight.email}</p>
                                </div>
                                <div className="text-xs text-zinc-500 font-mono bg-background px-3 py-1 rounded-md border border-zinc-800">
                                    ID: {insight._id.substring(0, 8)}...
                                </div>
                            </div>

                            <div className="bg-background rounded-xl p-4 border border-zinc-800/50">
                                <div className="flex items-center mb-2">
                                    <span className="w-2 h-2 rounded-full bg-success animate-pulse mr-2"></span>
                                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">System Output</span>
                                </div>
                                <p className="text-textMain leading-relaxed">
                                    {insight.ai_summary}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
