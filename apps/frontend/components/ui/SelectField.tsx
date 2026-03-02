import { SelectHTMLAttributes } from 'react';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: SelectOption[];
}

export default function SelectField({ label, options, className = '', ...rest }: SelectFieldProps) {
    return (
        <div>
            <label className="block text-sm font-medium text-textMuted mb-1">{label}</label>
            <select
                className={`w-full bg-background border border-zinc-800 rounded-lg px-4 py-2.5 text-textMain focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none ${className}`}
                {...rest}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
