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
        <div className="bg-surface p-6 rounded-2xl border border-zinc-800 shadow-lg mb-10">
            <h2 className="text-lg font-semibold text-textMain mb-4">Initialize New Goal</h2>
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-center">
                <InputField
                    type="text" required placeholder="Goal Title (e.g., Master Next.js)"
                    value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)}
                />
                <InputField
                    type="text" required placeholder="Tasks (comma separated)"
                    value={newTasks} onChange={(e) => setNewTasks(e.target.value)}
                />
                <Button
                    type="submit"
                    disabled={isCreating}
                    variant="primary"
                    size="md"
                >
                    {isCreating ? "Creating..." : "Deploy"}
                </Button>
            </form>
        </div>
    );
}
