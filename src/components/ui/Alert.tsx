import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }: AlertProps, ref) => {
    const baseClasses =
      'relative w-full rounded-lg border px-4 py-3 text-sm';

    const variantClasses = {
      default: 'bg-slate-50 border-slate-200 text-slate-900',
      destructive:
        'bg-red-50 border-red-200 text-red-700 [&>svg]:text-red-600',
      success: 'bg-green-50 border-green-200 text-green-800',
      warning: 'bg-amber-50 border-amber-200 text-amber-800',
    };

    return (
      <div
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], className)}
        role="alert"
        {...props}
      >
        {children}
      </div>
    );
  }
);
Alert.displayName = 'Alert';

const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_alert]:mt-1', className)}
    {...props}
  >
    {children}
  </div>
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertDescription };
