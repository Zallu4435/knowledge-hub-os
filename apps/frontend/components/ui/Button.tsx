import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className = '',
    ...rest
}: ButtonProps) {
    const baseStyles = "font-semibold rounded-lg transition-colors disabled:opacity-50 inline-flex justify-center items-center";

    const variants = {
        primary: "bg-primary hover:bg-indigo-600 text-white",
        secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-300",
        danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500",
        success: "bg-zinc-800 hover:bg-success hover:text-white text-zinc-300"
    };

    const sizes = {
        sm: "py-1.5 px-3 text-xs",
        md: "py-2 px-4 text-sm",
        lg: "py-2.5 px-6 text-base"
    };

    const widthClass = fullWidth ? "w-full" : "";

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
            {...rest}
        >
            {children}
        </button>
    );
}
