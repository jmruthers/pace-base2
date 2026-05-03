// @vitest-environment jsdom
/* eslint-disable pace-core-compliance/prefer-pace-core-components */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventConfigurationRoute } from './EventConfigurationRoute';

type EventQueryState = {
  isLoading: boolean;
  error: unknown;
  data: Record<string, unknown> | null;
};

type SaveMutationState = {
  mutateAsync: (values?: unknown) => Promise<void>;
  isPending: boolean;
};

let submitForm: (() => void) | null = null;

const routeState = vi.hoisted(() => ({
  selectedEventId: 'event-1' as string | null,
  selectedOrganisationId: 'org-1' as string | null,
  appId: 'base' as string | null,
  allowUpdate: true,
  eventQuery: {
    isLoading: false,
    error: null as unknown,
    data: {
      event_id: 'event-1',
      event_name: 'Summer Event',
      event_code: 'SUM-26',
      event_email: 'event@example.com',
      event_date: '2026-08-20T00:00:00.000Z',
      event_days: 2,
      event_venue: 'Main Hall',
      expected_participants: 10,
      typical_unit_size: 2,
      event_colours: { primary: '#000000' },
      is_visible: true,
      organisation_id: 'org-1',
      description: 'Description',
      registration_scope: 'org_only' as const,
      created_at: null,
      created_by: null,
      updated_at: '2026-08-01T00:00:00.000Z',
      updated_by: null,
    },
  } as EventQueryState,
  saveMutation: {
    mutateAsync: vi.fn(async () => undefined),
    isPending: false,
  } as SaveMutationState,
  toast: vi.fn(),
  handleMutationError: vi.fn(),
  showSuccessMessage: vi.fn(),
}));

vi.mock('@solvera/pace-core/components', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Button: ({
    children,
    type,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    type?: 'button' | 'submit';
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      type={type ?? 'button'}
      disabled={disabled}
      className={className}
      onClick={() => {
        if (type === 'submit') {
          submitForm?.();
        }
      }}
    >
      {children}
    </button>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <footer className={className}>{children}</footer>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  DatePickerWithTimezone: ({
    value,
    onChange,
    disabled,
  }: {
    value: Date | null;
    onChange: (value: Date | null) => void;
    disabled?: boolean;
  }) => (
    <input
      aria-label="event_date"
      disabled={disabled}
      value={value?.toISOString() ?? ''}
      onChange={() => onChange(value)}
    />
  ),
  FileDisplay: () => <p>Logo Preview</p>,
  FileUpload: ({
    label,
    onUploadError,
  }: {
    label: string;
    onUploadError: (error: Error) => void;
  }) => <button onClick={() => onUploadError(new Error('upload failed'))}>{label}</button>,
  Form: ({
    children,
    defaultValues,
    onSubmit,
    className,
  }: {
    children:
      | ((methods: { control: object; formState: { errors: object }; watch: (name: string) => unknown; setValue: (name: string, value: unknown) => void }) => React.ReactNode)
      | React.ReactNode;
    defaultValues: Record<string, unknown>;
    onSubmit: (values: Record<string, unknown>) => Promise<void>;
    className?: string;
  }) => {
    let values = { ...defaultValues };
    const methods = {
      control: {},
      formState: { errors: {} },
      watch: (name: string) => values[name],
      setValue: (name: string, value: unknown) => {
        values = { ...values, [name]: value };
      },
    };

    submitForm = () => {
      void onSubmit(values);
    };

    return <section className={className}>{typeof children === 'function' ? children(methods) : children}</section>;
  },
  FormField: ({
    label,
    render,
  }: {
    label: string;
    render: (props: { field: { value: unknown; onChange: (value: unknown) => void } }) => React.ReactNode;
  }) => (
    <label>
      {label}
      {render({ field: { value: '', onChange: vi.fn() } })}
    </label>
  ),
  Input: ({
    id,
    value,
    disabled,
  }: {
    id?: string;
    value?: string;
    disabled?: boolean;
  }) => (
    <input
      id={id}
      aria-label={id}
      value={value ?? ''}
      disabled={disabled}
      readOnly
    />
  ),
  Label: ({ htmlFor, children, className }: { htmlFor?: string; children: React.ReactNode; className?: string }) => (
    <label
      htmlFor={htmlFor}
      className={className}
    >
      {children}
    </label>
  ),
  LoadingSpinner: () => <p>Loading Spinner</p>,
  Select: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <p>{placeholder}</p>,
  Switch: ({ id, checked, disabled }: { id?: string; checked?: boolean; disabled?: boolean }) => (
    <input
      type="checkbox"
      id={id}
      aria-label={id}
      checked={Boolean(checked)}
      disabled={disabled}
      readOnly
    />
  ),
  Textarea: ({
    id,
    value,
    disabled,
    placeholder,
  }: {
    id?: string;
    value?: string;
    disabled?: boolean;
    placeholder?: string;
  }) => (
    <textarea
      id={id}
      aria-label={id}
      value={value ?? ''}
      disabled={disabled}
      placeholder={placeholder}
      readOnly
    />
  ),
}));

vi.mock('@solvera/pace-core/icons', () => ({
  Calendar: () => <span>Calendar Icon</span>,
}));

vi.mock('@solvera/pace-core/forms', () => ({
  AddressField: () => <p>AddressField</p>,
  createGoogleMapsJsAddressProviderAdapter: () => ({}),
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useToast: () => ({ toast: routeState.toast }),
  useUnifiedAuth: () => ({
    selectedEventId: routeState.selectedEventId,
    selectedOrganisationId: routeState.selectedOrganisationId,
    user: { id: 'user-1' },
    appId: routeState.appId,
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
  PagePermissionGuard: ({
    operation,
    fallback,
    children,
  }: {
    operation: 'read' | 'update';
    fallback?: React.ReactNode;
    children: React.ReactNode;
  }) => (operation === 'update' && !routeState.allowUpdate ? <>{fallback}</> : <>{children}</>),
}));

vi.mock('@solvera/pace-core/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/utils')>();
  return {
    ...actual,
    NormalizeSupabaseError: () => ({ message: 'Fetch failed' }),
    HandleMutationError: (...args: unknown[]) => routeState.handleMutationError(...args),
    ShowSuccessMessage: (...args: unknown[]) => routeState.showSuccessMessage(...args),
  };
});

vi.mock('@/features/eventConfiguration/configuration', () => ({
  useEventConfigurationRecord: () => routeState.eventQuery,
  useSaveEventConfiguration: () => routeState.saveMutation,
}));

vi.mock('@/features/eventConfiguration/useEventLogoReference', () => ({
  useEventLogoReference: () => ({ data: null, refetch: vi.fn() }),
}));

describe('EventConfigurationRoute', () => {
  afterEach(() => {
    cleanup();
    routeState.selectedEventId = 'event-1';
    routeState.selectedOrganisationId = 'org-1';
    routeState.appId = 'base';
    routeState.allowUpdate = true;
    routeState.eventQuery = {
      isLoading: false,
      error: null,
      data: {
        event_id: 'event-1',
        event_name: 'Summer Event',
        event_code: 'SUM-26',
        event_email: 'event@example.com',
        event_date: '2026-08-20T00:00:00.000Z',
        event_days: 2,
        event_venue: 'Main Hall',
        expected_participants: 10,
        typical_unit_size: 2,
        event_colours: { primary: '#000000' },
        is_visible: true,
        organisation_id: 'org-1',
        description: 'Description',
        registration_scope: 'org_only' as const,
        created_at: null,
        created_by: null,
        updated_at: '2026-08-01T00:00:00.000Z',
        updated_by: null,
      },
    };
    routeState.saveMutation = {
      mutateAsync: vi.fn(async () => undefined),
      isPending: false,
    };
    routeState.toast.mockReset();
    routeState.handleMutationError.mockReset();
    routeState.showSuccessMessage.mockReset();
    submitForm = null;
  });

  it('shows no-event state when no event is selected', () => {
    routeState.selectedEventId = null;

    render(<EventConfigurationRoute />);

    expect(screen.getByText('No event selected. Choose an event from the header to begin.')).toBeTruthy();
  });

  it('shows loading state while event record loads', () => {
    routeState.eventQuery = {
      isLoading: true,
      error: null,
      data: null,
    } as EventQueryState;

    render(<EventConfigurationRoute />);

    expect(screen.getByText('Loading event data…')).toBeTruthy();
  });

  it('shows error state when event query fails', () => {
    routeState.eventQuery = {
      isLoading: false,
      error: new Error('boom'),
      data: null,
    } as EventQueryState;

    render(<EventConfigurationRoute />);

    expect(screen.getByText('Fetch failed')).toBeTruthy();
  });

  it('renders update-denied fallback with disabled fields and hidden save/upload actions', () => {
    routeState.allowUpdate = false;

    render(<EventConfigurationRoute />);

    expect((screen.getByLabelText('event_name') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('registration_scope') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Upload logo' })).toBeNull();
  });

  it('shows success feedback on save success', async () => {
    render(<EventConfigurationRoute />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(routeState.saveMutation.mutateAsync).toHaveBeenCalled();
      expect(routeState.showSuccessMessage).toHaveBeenCalledWith(
        'Event saved successfully!',
        routeState.toast
      );
    });
  });

  it('routes save failures through the mutation error helper', async () => {
    routeState.saveMutation = {
      mutateAsync: vi.fn(async () => {
        throw new Error('save failed');
      }),
      isPending: false,
    };

    render(<EventConfigurationRoute />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(routeState.handleMutationError).toHaveBeenCalledWith(
        expect.any(Error),
        'event-configuration-save',
        routeState.toast
      );
    });
  });

  it('routes upload failures through the mutation error helper', () => {
    render(<EventConfigurationRoute />);

    fireEvent.click(screen.getByRole('button', { name: 'Upload logo' }));

    expect(routeState.handleMutationError).toHaveBeenCalledWith(
      expect.any(Error),
      'event-logo-upload',
      routeState.toast
    );
  });
});
