import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import { visuallyHiddenClass } from './VisuallyHidden';
import styles from './Field.module.css';

function describedBy(...ids: (string | undefined)[]) {
  return ids.filter(Boolean).join(' ') || undefined;
}

interface LayoutProps {
  /** md = 36px, sm = 32px (toolbars, pager). */
  size?: 'md' | 'sm';
  /** Label beside the control instead of above it. */
  inline?: boolean;
  /** Keep the label for assistive tech only (e.g. a search box with an icon and placeholder). */
  hideLabel?: boolean;
}

function fieldClass(className: string | undefined, { size, inline }: LayoutProps, extra?: string | false) {
  return [styles.field, inline && styles.inline, size === 'sm' && styles.sm, extra, className]
    .filter(Boolean)
    .join(' ');
}

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'>, LayoutProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  icon?: IconName;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  hint,
  error,
  icon,
  className,
  size,
  inline,
  hideLabel,
  ...rest
}: TextFieldProps) {
  const id = useId();
  return (
    <div className={fieldClass(className, { size, inline }, icon && styles.withIcon)}>
      <label htmlFor={id} className={hideLabel ? visuallyHiddenClass : styles.label}>
        {label}
      </label>
      <div className={styles.controlWrap}>
        {icon && <Icon name={icon} size={16} className={styles.leadingIcon} />}
        <input
          id={id}
          className={styles.control}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(hint ? `${id}-hint` : undefined, error ? `${id}-error` : undefined)}
          {...rest}
        />
      </div>
      {hint && (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}

export interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'size'>, LayoutProps {
  label: ReactNode;
  options: readonly { value: string; label: string }[];
}

export function SelectField({
  label,
  options,
  className,
  size,
  inline,
  hideLabel,
  ...rest
}: SelectFieldProps) {
  const id = useId();
  return (
    <div className={fieldClass(className, { size, inline })}>
      <label htmlFor={id} className={hideLabel ? visuallyHiddenClass : styles.label}>
        {label}
      </label>
      <div className={styles.controlWrap}>
        <select id={id} className={styles.control} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={16} className={styles.selectArrow} />
      </div>
    </div>
  );
}

export interface CheckboxGroupProps<T extends string> {
  legend: ReactNode;
  options: readonly { value: T; label: ReactNode }[];
  value: readonly T[];
  onChange: (next: T[]) => void;
  columns?: 1 | 2;
}

/** Native checkboxes in a fieldset/legend: keyboard and screen-reader support come from the platform. */
export function CheckboxGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
  columns = 1,
}: CheckboxGroupProps<T>) {
  const selected = new Set(value);
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={[styles.options, columns === 2 && styles.columns2].filter(Boolean).join(' ')}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="checkbox"
              checked={selected.has(option.value)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? options
                        .filter((o) => o.value === option.value || selected.has(o.value))
                        .map((o) => o.value)
                    : value.filter((v) => v !== option.value),
                )
              }
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
