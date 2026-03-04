"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import CreateGoalWidget from "../../components/dashboard/CreateGoalWidget";
import GoalCard from "../../components/dashboard/GoalCard";
import { apiClient } from "../../lib/api-client";

// Define our TypeScript interfaces
interface Task {
    id: string;
    title: string;
    status: "TODO" | "IN_PROGRESS" | "DONE";
}

interface Goal {
    id: string;
    title: string;
    tasks: Task[];
}

export default function DashboardPage() {
    const router = useRouter();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Fetch Goals on Mount
    useEffect(() => {
        const fetchGoals = async () => {
            try {
                const res = await apiClient.get('/goals');
                setGoals(res.data);
            } catch (err: any) {
                setError(err.message || "Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };

        fetchGoals();
    }, [router]);

    // Complete a Task
    const handleCompleteTask = async (taskId: string, goalId: string) => {
        try {
            // Optimistic UI Update: Mark it done immediately on the screen
            setGoals((prev) =>
                prev.map((g) => {
                    if (g.id === goalId) {
                        return {
                            ...g,
                            tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, status: "DONE" } : t)),
                        };
                    }
                    return g;
                })
            );

            // Fire the actual request transparently through the secure interceptor
            await apiClient.patch(`/goals/tasks/${taskId}/complete`);
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Failed to sync task completion. Please refresh.");
        }
    };

    // Create a New Goal Handler Passed to Widget
    const handleGoalCreated = async (title: string, taskArray: string[]) => {
        try {
            const res = await apiClient.post("/goals", { title, tasks: taskArray });
            setGoals((prev) => [res.data, ...prev]);
        } catch (err: any) {
            setError(err.message || "Failed to create goal");
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <svg className="animate-spin h-10 w-10 text-primary mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-textMuted font-medium">Loading Workspace...</p>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto mt-8 px-4 pb-12">
            <div className="mb-10">
                <div className="inline-flex items-center justify-center px-4 py-1.5 mb-4 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
                    Core Engine
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-textMain to-zinc-500">
                        My Workspace
                    </span>
                </h1>
                <p className="text-lg text-textMuted max-w-2xl">Manage your goals, complete tasks, and feed intelligence into your AI productivity coach.</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 flex items-start">
                    <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {/* --- CREATE NEW GOAL WIDGET --- */}
            <CreateGoalWidget onGoalCreated={handleGoalCreated} />

            {/* --- GOALS LIST --- */}
            <div className="mt-12">
                <h2 className="text-2xl font-bold text-textMain mb-6 flex items-center">
                    Active Goals
                    <span className="ml-3 px-2.5 py-0.5 rounded-md bg-zinc-800 text-xs font-medium text-textMuted">
                        {goals.length}
                    </span>
                </h2>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                    {goals.length === 0 ? (
                        <div className="col-span-full bg-surface/30 border border-zinc-800/50 border-dashed rounded-2xl flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                                <span className="text-2xl">🎯</span>
                            </div>
                            <h3 className="text-xl font-bold text-textMain mb-2">No active goals found</h3>
                            <p className="text-textMuted max-w-sm">You haven't initialized any goals yet. Create your first goal above to start tracking your progress.</p>
                        </div>
                    ) : (
                        goals.map(goal => (
                            <GoalCard key={goal.id} goal={goal} onCompleteTask={handleCompleteTask} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
