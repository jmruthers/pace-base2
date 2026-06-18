/**
 * Shared semantic stand-ins for pace-core components in page tests.
 *
 * Usage: in `vi.mock('@solvera/pace-core/components', async () => { ... })`, import
 * these mocks instead of rendering native `<button>`, `<input>`, or `<textarea>` in JSX.
 * Do not silence prefer-pace-core-components in test files; extend this module instead.
 *
 * @example
 * vi.mock('@solvera/pace-core/components', async () => {
 *   const { MockButton, MockTextField, MockFieldLabel } = await import('@/test/paceCoreElementMocks');
 *   return { Button: MockButton, Input: MockTextField, Label: MockFieldLabel };
 * });
 */
import type { KeyboardEvent, ReactNode } from 'react';

type MockButtonProps = {
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  'aria-label'?: string;
  ariaLabel?: string;
  'data-variant'?: string;
  variant?: string;
};

export function MockButton({
  children,
  onClick,
  disabled,
  type,
  className,
  'aria-label': ariaLabelAttr,
  ariaLabel,
  variant,
  'data-variant': dataVariant,
}: MockButtonProps) {
  const label = ariaLabelAttr ?? ariaLabel;
  return (
    <section
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled}
      className={className}
      data-button-type={type ?? 'button'}
      data-variant={dataVariant ?? variant}
      onClick={() => {
        if (!disabled) {
          onClick?.();
        }
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
          event.preventDefault();
          onClick?.();
        }
      }}
    >
      {children}
    </section>
  );
}

type MockTextFieldProps = {
  id?: string;
  value?: string;
  disabled?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  'aria-label'?: string;
  onChange?: (value: string) => void;
};

function bindMockInputValue(element: HTMLElement, onChange?: (value: string) => void): void {
  if (element.dataset.mockInputBound === 'true') {
    return;
  }
  element.dataset.mockInputBound = 'true';
  Object.defineProperty(element, 'value', {
    configurable: true,
    get() {
      return element.dataset.value ?? '';
    },
    set(next: string) {
      element.dataset.value = next;
      onChange?.(next);
    },
  });
}

/** Numeric field stand-in with spinbutton role for RTL `fireEvent.change` compatibility. */
export function MockNumberField({
  id,
  value,
  disabled,
  'aria-label': ariaLabel,
  onChange,
}: MockTextFieldProps) {
  const fieldId = id ?? ariaLabel ?? 'mock-number-field';

  return (
    <section
      role="spinbutton"
      id={fieldId}
      aria-label={ariaLabel ?? fieldId}
      aria-disabled={disabled}
      data-value={value ?? ''}
      ref={(element) => {
        if (element != null) {
          bindMockInputValue(element, onChange);
        }
      }}
    />
  );
}

export function MockTextField({
  id,
  value,
  disabled,
  placeholder,
  readOnly,
  'aria-label': ariaLabel,
  onChange,
}: MockTextFieldProps) {
  const fieldId = id ?? ariaLabel ?? 'mock-text-field';

  return (
    <section
      role="textbox"
      id={fieldId}
      aria-label={ariaLabel ?? fieldId}
      aria-disabled={disabled}
      data-value={value ?? ''}
      data-placeholder={placeholder}
      data-readonly={readOnly === true ? 'true' : undefined}
      onClick={() => {
        if (!disabled && !readOnly) {
          onChange?.(value ?? '');
        }
      }}
      onKeyDown={(event) => {
        if (disabled || readOnly || onChange == null) {
          return;
        }
        if (event.key === 'Backspace') {
          onChange((value ?? '').slice(0, -1));
          return;
        }
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          onChange(`${value ?? ''}${event.key}`);
        }
      }}
    />
  );
}

/** Multiline text control stand-in; maps to pace-core `Textarea` in component mocks. */
export function MockTextarea({
  id,
  value,
  disabled,
  placeholder,
  readOnly,
  'aria-label': ariaLabel,
  onChange,
}: MockTextFieldProps) {
  const fieldId = id ?? ariaLabel ?? 'mock-textarea';

  return (
    <section
      role="textbox"
      id={fieldId}
      aria-label={ariaLabel ?? fieldId}
      aria-disabled={disabled}
      data-multiline="true"
      data-value={value ?? ''}
      data-placeholder={placeholder}
      data-readonly={readOnly === true ? 'true' : undefined}
      onClick={() => {
        if (!disabled && !readOnly) {
          onChange?.(value ?? '');
        }
      }}
    />
  );
}

type MockCheckboxFieldProps = {
  id?: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
};

export function MockCheckboxField({ id, checked, disabled, onChange }: MockCheckboxFieldProps) {
  return (
    <section
      role="checkbox"
      id={id}
      aria-label={id}
      aria-checked={checked === true}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onChange?.(!checked);
        }
      }}
    />
  );
}

/** Toggle stand-in; maps to pace-core `Switch` in component mocks. */
export function MockSwitch({ id, checked, disabled, onChange }: MockCheckboxFieldProps) {
  return (
    <section
      role="switch"
      id={id}
      aria-label={id}
      aria-checked={checked === true}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onChange?.(!checked);
        }
      }}
    />
  );
}

type MockFieldLabelProps = {
  children?: ReactNode;
  htmlFor?: string;
  className?: string;
};

export function MockFieldLabel({ children, htmlFor, className }: MockFieldLabelProps) {
  return (
    <section data-html-for={htmlFor} className={className}>
      {children}
    </section>
  );
}
