import Button from "../ui/Button";

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

interface GoalCardProps {
    goal: Goal;
    onCompleteTask: (taskId: string, goalId: string) => void;
}

export default function GoalCard({ goal, onCompleteTask }: GoalCardProps) {
    return (
        <div key={goal.id} className="bg-surface border border-zinc-800 rounded-2xl p-6 shadow-lg flex flex-col">
            <h3 className="text-xl font-bold text-textMain mb-4 border-b border-zinc-800 pb-3">
                {goal.title}
            </h3>

            <div className="space-y-3 flex-1">
                {goal.tasks.map((task) => (
                    <div
                        key={task.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${task.status === "DONE"
                            ? "bg-background/50 border-zinc-800/50 opacity-60"
                            : "bg-background border-zinc-800"
                            }`}
                    >
                        <span className={`text-sm font-medium ${task.status === "DONE" ? "text-zinc-500 line-through" : "text-textMain"}`}>
                            {task.title}
                        </span>

                        {task.status !== "DONE" && (
                            <Button
                                onClick={() => onCompleteTask(task.id, goal.id)}
                                variant="success"
                                size="sm"
                            >
                                Complete
                            </Button>
                        )}
                        {task.status === "DONE" && (
                            <span className="text-xs font-bold text-success px-2 py-1 bg-success/10 rounded-md">
                                DONE
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
