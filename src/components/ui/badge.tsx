import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'error';
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    const variants = {
        default: "bg-slate-900 text-slate-50 hover:bg-slate-900/80",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80",
        outline: "text-slate-950 border border-slate-200",
        success: "bg-green-100 text-green-800 border-green-200",
        warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
        error: "bg-red-100 text-red-800 border-red-200",
    };

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2",
                variants[variant],
                className
            )}
            {...props}
        />
    )
}

export { Badge }
