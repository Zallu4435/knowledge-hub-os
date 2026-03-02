interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export default function InputField({ label, ...rest }: InputFieldProps) {
    return (
        <div className="w-full">
            {label && <label className="block text-sm font-medium text-textMuted mb-1">{label}</label>}
            <input
                className="w-full bg-background border border-zinc-800 rounded-lg px-4 py-2.5 text-textMain focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                {...rest}
            />
        </div>
    );
}
