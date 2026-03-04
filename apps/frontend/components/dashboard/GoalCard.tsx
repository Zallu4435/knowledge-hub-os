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
    const isGoalCompleted = goal.tasks.every(t => t.status === "DONE") && goal.tasks.length > 0;

    return (
        <div key={goal.id} className={`bg-surface/80 backdrop-blur-sm border ${isGoalCompleted ? 'border-success/30 bg-success/5' : 'border-zinc-800/60'} rounded-2xl p-6 md:p-8 shadow-xl flex flex-col transition-all duration-300 hover:border-zinc-700`}>
            <div className="flex justify-between items-start border-b border-zinc-800/80 pb-4 mb-5">
                <h3 className={`text-xl font-bold tracking-tight ${isGoalCompleted ? 'text-success' : 'text-textMain'}`}>
                    {goal.title}
                </h3>
                {isGoalCompleted && (
                    <span className="bg-success text-white text-[10px] uppercase font-bold px-2 py-1 rounded-md tracking-wider shadow-sm shadow-success/20">
                        100% Done
                    </span>
                )}
            </div>

            <div className="space-y-3 flex-1">
                {goal.tasks.length === 0 ? (
                    <div className="text-center py-6 text-sm text-zinc-500 italic">No tasks added to this goal.</div>
                ) : goal.tasks.map((task) => (
                    <div
                        key={task.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${task.status === "DONE"
                            ? "bg-background/30 border-zinc-800/30 opacity-60"
                            : "bg-surface border-zinc-700/50 hover:border-zinc-600 shadow-sm"
                            }`}
                    >
                        <div className="flex items-center space-x-3 overflow-hidden pr-2">
                            {task.status === "DONE" ? (
                                <svg className="w-5 h-5 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-zinc-600 flex-shrink-0"></div>
                            )}
                            <span className={`text-sm font-medium truncate ${task.status === "DONE" ? "text-zinc-500 line-through" : "text-textMain"}`}>
                                {task.title}
                            </span>
                        </div>

                        {task.status !== "DONE" ? (
                            <Button
                                onClick={() => onCompleteTask(task.id, goal.id)}
                                variant="success"
                                size="sm"
                                className="flex-shrink-0 !py-1.5 !px-3 font-semibold text-xs rounded-lg"
                            >
                                Done
                            </Button>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}
