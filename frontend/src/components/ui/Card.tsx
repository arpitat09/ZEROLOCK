import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hover = false,
  glow = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-bg-card border border-border-dark rounded-xl p-5 shadow-card transition-all duration-200 ${
        hover ? 'hover:border-border-light hover:bg-bg-hover/80 hover:-translate-y-0.5' : ''
      } ${glow ? 'hover:shadow-glow-primary' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`flex items-center justify-between pb-3 mb-3 border-b border-border-dark ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-base font-semibold text-txt-main font-heading ${className}`} {...props}>
    {children}
  </h3>
);
