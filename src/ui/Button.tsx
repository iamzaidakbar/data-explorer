import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  /** Decorative icon before / after the label. */
  icon?: IconName;
  iconEnd?: IconName;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  icon,
  iconEnd,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], size === 'sm' && styles.sm, className]
    .filter(Boolean)
    .join(' ');
  const iconSize = size === 'sm' ? 14 : 16;
  return (
    <button type={type} className={classes} {...rest}>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconEnd && <Icon name={iconEnd} size={iconSize} />}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonProps, 'aria-label' | 'children' | 'icon' | 'iconEnd'> {
  /** Required: icon-only buttons have no visible text, so this is their accessible name. */
  label: string;
  icon: IconName | ReactNode;
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      className={[styles.icon, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {typeof icon === 'string' ? <Icon name={icon as IconName} size={size === 'sm' ? 14 : 16} /> : icon}
    </Button>
  );
}
