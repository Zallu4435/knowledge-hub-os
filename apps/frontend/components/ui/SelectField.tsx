import { SelectHTMLAttributes } from 'react';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: SelectOption[];
    error?: string;
}

export default function SelectField({ label, options, error, className = '', ...rest }: SelectFieldProps) {
    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-textMuted mb-1.5">{label}</label>
            <div className="relative">
                <select
                    className={`w-full bg-background border rounded-lg px-4 py-3 text-textMain focus:outline-none focus:ring-1 transition-colors appearance-none ${error
                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50 bg-red-500/5'
                            : 'border-zinc-800 focus:border-primary focus:ring-primary'
                        } ${className}`}
                    {...rest}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-surface text-textMain">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-textMuted">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                </div>
            </div>
            {error && <p className="mt-2 text-sm text-red-400 font-medium">{error}</p>}
        </div>
    );
}
