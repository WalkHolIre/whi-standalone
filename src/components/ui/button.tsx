import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'default', ...props }, ref) => {
        const variants = {
            primary: 'bg-whi text-white hover:bg-whi-hover shadow-sm',
            secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300',
            outline: 'border border-slate-300 bg-transparent hover:bg-slate-50 text-slate-700',
            ghost: 'hover:bg-slate-100 text-slate-600',
        };

        const sizes = {
            default: 'h-10 px-4 py-2',
            sm: 'h-8 px-3 text-xs',
            lg: 'h-12 px-8',
            icon: 'h-9 w-9 flex items-center justify-center',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
