export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
            <div className="relative flex items-center justify-center w-24 h-24 mb-8">
                {/* Outer pulsing ring */}
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>

                {/* Inner spinning gradient ring */}
                <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>

                {/* Center logo/dot */}
                <div className="w-8 h-8 bg-primary rounded-lg rotate-45 animate-pulse shadow-lg shadow-primary/30"></div>
            </div>

            <h2 className="text-2xl font-bold text-textMain tracking-tight mb-2">Connecting to Core...</h2>
            <p className="text-textMuted text-center max-w-sm animate-pulse">
                Initializing services and retrieving your secure workspace payload.
            </p>
        </div>
    );
}
