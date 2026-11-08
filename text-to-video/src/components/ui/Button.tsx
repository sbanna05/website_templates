import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: IconName;
  size?: 'sm' | 'md';
  children?: ReactNode;
}

export function Button({ variant = 'secondary', icon, size = 'md', className = '', children, ...rest }: ButtonProps) {
  return (
    <button type="button" className={`btn btn--${variant} btn--${size} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children && <span>{children}</span>}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  active?: boolean;
  size?: number;
}

/** Square icon-only button; `label` doubles as tooltip and accessible name. */
export function IconButton({ icon, label, active = false, size = 17, className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn ${active ? 'is-active' : ''} ${className}`}
      aria-label={label}
      aria-pressed={active || undefined}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}
