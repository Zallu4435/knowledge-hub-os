import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
    let insights = [];
    let error = null;

    try {
        // 1. Extract the token from the secure Next.js Server Cookie
        const cookieStore = await cookies();
        const token = cookieStore.get('kh_os_token')?.value;

        if (!token) {
            throw new Error("Unauthorized: Please log in to view your insights.");
        }

        // 2. Attach it to the FastAPI request
        const aiServiceUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';
        const res = await fetch(`${aiServiceUrl}/insights`, {
            cache: 'no-store',
            headers: {
                'Authorization': `Bearer ${token}`, // 🔒 Secure payload!
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            if (res.status === 401) throw new Error("Your session has expired. Please log in again.");
            throw new Error("Failed to fetch from AI Service");
        }

        const data = await res.json();
        insights = data.insights;
    } catch (err: any) {
        error = err.message;
    }

    return (
        <div className="max-w-4xl mx-auto mt-10">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-primary mb-3">AI Intelligence Feed</h1>
                <p className="text-textMuted">Real-time career roadmaps and active productivity coaching.</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center mb-8">
                    Unable to connect to the AI Service Brain: {error}
                </div>
            )}

            <div className="grid gap-6">
                {insights.length === 0 && !error ? (
                    <div className="text-center text-zinc-500 py-10">No insights generated yet. Complete a task to wake up the AI!</div>
                ) : (
                    insights.map((insight: any) => {
                        // Fallback to career_roadmap for older test data
                        const type = insight.type || "career_roadmap";
                        const isRoadmap = type === "career_roadmap";

                        return (
                            <div
                                key={insight._id}
                                className={`bg-surface border rounded-2xl p-6 shadow-lg transition-colors ${isRoadmap ? 'border-zinc-800 hover:border-indigo-500/50' : 'border-zinc-800 hover:border-emerald-500/50'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-textMain flex items-center">
                                            {isRoadmap ? "🧠 Career Roadmap Generated" : "🎯 Productivity Coach"}
                                        </h3>

                                        {/* Dynamic Badges based on event type */}
                                        <div className="flex gap-2 mt-2">
                                            {isRoadmap ? (
                                                <>
                                                    <span className="text-xs font-medium px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                                                        Role: {insight.role || "Developer"}
                                                    </span>
                                                    <span className="text-xs font-medium px-2.5 py-1 bg-zinc-800 text-zinc-400 rounded-full">
                                                        User: {insight.userId.substring(0, 8)}...
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-xs font-medium px-2.5 py-1 bg-success/10 text-success rounded-full">
                                                        Task: {insight.task}
                                                    </span>
                                                    <span className="text-xs font-medium px-2.5 py-1 bg-zinc-800 text-zinc-400 rounded-full">
                                                        Goal: {insight.goal}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-xs text-zinc-500 font-mono bg-background px-3 py-1 rounded-md border border-zinc-800">
                                        ID: {insight._id.substring(0, 8)}...
                                    </div>
                                </div>

                                <div className={`rounded-xl p-4 border ${isRoadmap ? 'bg-background border-zinc-800/50' : 'bg-success/5 border-success/10'
                                    }`}>
                                    <div className="flex items-center mb-2">
                                        <span className={`w-2 h-2 rounded-full animate-pulse mr-2 ${isRoadmap ? 'bg-primary' : 'bg-success'}`}></span>
                                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                            Gemini Output
                                        </span>
                                    </div>
                                    <p className="text-textMain leading-relaxed text-sm">
                                        {insight.ai_summary}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
