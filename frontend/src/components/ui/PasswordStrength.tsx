import React from 'react';

interface PasswordStrengthProps {
  password?: string;
  label?: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({
  password = '',
  label = 'Password Strength',
}) => {
  const getStrength = (pass: string) => {
    let score = 0;
    if (!pass) return { score: 0, text: 'None', color: 'bg-txt-muted' };

    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 20, text: 'Very Weak', color: 'bg-status-error' };
      case 2:
        return { score: 40, text: 'Weak', color: 'bg-status-warning' };
      case 3:
        return { score: 60, text: 'Fair', color: 'bg-status-info' };
      case 4:
        return { score: 80, text: 'Strong', color: 'bg-accent-secondary' };
      case 5:
        return { score: 100, text: 'Very Strong (256-bit entropy ready)', color: 'bg-status-success' };
      default:
        return { score: 0, text: 'Very Weak', color: 'bg-status-error' };
    }
  };

  const strength = getStrength(password);

  return (
    <div className="w-full flex flex-col gap-1.5 mt-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-txt-muted">{label}</span>
        <span className="font-semibold text-txt-secondary">{strength.text}</span>
      </div>
      <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${strength.color}`}
          style={{ width: `${strength.score}%` }}
        />
      </div>
      <div className="grid grid-cols-4 gap-1 text-[10px] text-txt-muted mt-0.5">
        <span className={password.length >= 12 ? 'text-status-success' : ''}>• 12+ chars</span>
        <span className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-status-success' : ''}>
          • Uppercase & lowercase
        </span>
        <span className={/\d/.test(password) ? 'text-status-success' : ''}>• Numbers</span>
        <span className={/[^a-zA-Z0-9]/.test(password) ? 'text-status-success' : ''}>• Symbols</span>
      </div>
    </div>
  );
};
