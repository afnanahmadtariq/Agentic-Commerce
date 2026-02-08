import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    className,
    variant = 'default',
    size = 'default',
    asChild = false,
    ...props
}, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
        <Comp
            className={cn(
                'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
                {
                    'bg-blue-600 text-white shadow hover:bg-blue-700': variant === 'default',
                    'border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground': variant === 'outline',
                    'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
                    'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80': variant === 'secondary',
                    'text-primary underline-offset-4 hover:underline': variant === 'link',
                    'h-9 px-4 py-2': size === 'default',
                    'h-8 rounded-md px-3 text-xs': size === 'sm',
                    'h-10 rounded-md px-8': size === 'lg',
                    'h-9 w-9': size === 'icon',
                },
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
Button.displayName = 'Button';

export { Button };
