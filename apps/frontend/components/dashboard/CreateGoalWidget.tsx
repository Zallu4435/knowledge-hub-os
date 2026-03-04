import { useState } from "react";
import InputField from "../ui/InputField";
import Button from "../ui/Button";


interface CreateGoalWidgetProps {
    onGoalCreated: (newGoalTitle: string, taskArray: string[]) => Promise<void>;
}

export default function CreateGoalWidget({ onGoalCreated }: CreateGoalWidgetProps) {
    const [newGoalTitle, setNewGoalTitle] = useState("");
    const [newTasks, setNewTasks] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        const taskArray = newTasks.split(",").map(t => t.trim()).filter(t => t.length > 0);
        try {
            await onGoalCreated(newGoalTitle, taskArray);
            setNewGoalTitle("");
            setNewTasks("");
        } catch (error) {
            console.error(error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="bg-surface/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-800/60 shadow-xl mb-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex items-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-textMain tracking-tight">Initialize New Goal</h2>
                    <p className="text-sm text-textMuted mt-1">Break your next milestone into actionable tasks.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-5 items-start">
                <div className="flex-1 w-full space-y-4">
                    <InputField
                        type="text" required placeholder="e.g. Master Next.js 14 App Router"
                        value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)}
                        className="bg-background/80"
                        label="Goal Objective"
                    />
                </div>
                <div className="flex-1 w-full space-y-4">
                    <InputField
                        type="text" required placeholder="e.g. Read docs, Build clone, Deploy"
                        value={newTasks} onChange={(e) => setNewTasks(e.target.value)}
                        className="bg-background/80"
                        label="Comma-Separated Tasks"
                    />
                </div>
                <div className="w-full md:w-auto mt-auto py-2">
                    <Button
                        type="submit"
                        disabled={isCreating}
                        variant="primary"
                        size="lg"
                        className="w-full md:w-auto h-[50px] shadow-lg shadow-primary/20 whitespace-nowrap px-8"
                    >
                        {isCreating ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Deploying
                            </span>
                        ) : "Deploy Goal"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
