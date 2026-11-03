import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'cyan' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  const variantStyles = {
    primary: 'bg-accent-primary/10 text-accent-primary border-accent-primary/30',
    cyan: 'bg-accent-secondary/10 text-accent-secondary border-accent-secondary/30',
    success: 'bg-status-success/10 text-status-success border-status-success/30',
    warning: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    error: 'bg-status-error/10 text-status-error border-status-error/30',
    neutral: 'bg-bg-hover text-txt-secondary border-border-dark',
  };

  const dotStyles = {
    primary: 'bg-accent-primary',
    cyan: 'bg-accent-secondary',
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    error: 'bg-status-error',
    neutral: 'bg-txt-muted',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyles[variant]}`} />}
      {children}
    </span>
  );
};
