"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import CreateGoalWidget from "../../components/dashboard/CreateGoalWidget";
import GoalCard from "../../components/dashboard/GoalCard";
import { apiClient } from "../../lib/api";

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
                setError(err.message);
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
        const res = await apiClient.post("/goals", { title, tasks: taskArray });
        setGoals((prev) => [res.data, ...prev]);
    };

    if (loading) return <div className="text-center mt-20 text-textMuted">Loading Workspace...</div>;

    return (
        <div className="max-w-5xl mx-auto mt-10">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-textMain mb-2">My Workspace</h1>
                <p className="text-textMuted">Manage your goals and feed your AI productivity coach.</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8">
                    {error}
                </div>
            )}

            {/* --- CREATE NEW GOAL WIDGET --- */}
            <CreateGoalWidget onGoalCreated={handleGoalCreated} />

            {/* --- GOALS LIST --- */}
            <div className="grid gap-6 md:grid-cols-2">
                {goals.length === 0 ? (
                    <div className="col-span-2 text-center py-10 text-zinc-500">No active goals. Create one above!</div>
                ) : (
                    goals.map(goal => (
                        <GoalCard key={goal.id} goal={goal} onCompleteTask={handleCompleteTask} />
                    ))
                )}
            </div>
        </div>
    );
}
