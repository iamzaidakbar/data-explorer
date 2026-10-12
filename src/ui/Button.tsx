import type { ButtonHTMLAttributes, Ref } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], size === 'sm' && styles.sm, className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...rest} />;
}

export interface IconButtonProps extends Omit<ButtonProps, 'aria-label' | 'children'> {
  /** Required: icon-only buttons have no visible text, so this is their accessible name. */
  label: string;
  icon: React.ReactNode;
}

export function IconButton({ label, icon, variant = 'ghost', className, ...rest }: IconButtonProps) {
  return (
    <Button
      variant={variant}
      aria-label={label}
      title={label}
      className={[styles.icon, className].filter(Boolean).join(' ')}
      {...rest}
    >
      <span aria-hidden="true">{icon}</span>
    </Button>
  );
}
