interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export default function InputField({ label, error, className = '', ...rest }: InputFieldProps) {
    return (
        <div className="w-full">
            {label && <label className="block text-sm font-medium text-textMuted mb-1.5">{label}</label>}
            <input
                className={`w-full bg-background border rounded-lg px-4 py-3 text-textMain focus:outline-none focus:ring-1 transition-colors ${error
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50 bg-red-500/5'
                        : 'border-zinc-800 focus:border-primary focus:ring-primary'
                    } ${className}`}
                {...rest}
            />
            {error && <p className="mt-2 text-sm text-red-400 font-medium">{error}</p>}
        </div>
    );
}
