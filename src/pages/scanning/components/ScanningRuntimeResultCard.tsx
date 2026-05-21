import {
  Badge,
  Button,
  Card,
  CardContent,
  LoadingSpinner,
} from '@solvera/pace-core/components';

import {
  acceptedBodyText,
  isOverridableRejection,
  overrideBodyText,
  rejectionDescription,
  rejectionLabel,
} from '@/features/scanningRuntime/labels';
import type { ScanningRuntimeReadySurface } from '@/pages/scanning/scanningRuntimeControllerTypes';
import type { ScanningRuntimePanelState } from '@/pages/scanning/scanningRuntimePageTypes';

type Props = Pick<
  ScanningRuntimeReadySurface,
  | 'panel'
  | 'formatScanned'
  | 'handleDismiss'
  | 'canUpdateScanning'
  | 'pendingOverride'
  | 'overrideDialogOpenChange'
>;

function AcceptedPanel(props: { name: string; scannedAt: number; formatScanned: (ts: number) => string }) {
  return (
    <>
      <section className="grid grid-cols-[auto_1fr] items-center gap-2">
        <Badge variant="solid-main-normal">Accepted</Badge>
        <p className="min-w-0 truncate">{props.name}</p>
      </section>
      <p>{acceptedBodyText()}</p>
      <p>
        <small>{props.formatScanned(props.scannedAt)}</small>
      </p>
    </>
  );
}

function OverrideOkPanel(props: { name: string; scannedAt: number; formatScanned: (ts: number) => string }) {
  return (
    <>
      <section className="grid grid-cols-[auto_1fr] items-center gap-2">
        <Badge variant="solid-acc-normal">Accepted (override)</Badge>
        <p className="min-w-0 truncate">{props.name}</p>
      </section>
      <p>{overrideBodyText()}</p>
      <p>
        <small>{props.formatScanned(props.scannedAt)}</small>
      </p>
    </>
  );
}

function RejectedPanel(props: Props) {
  if (props.panel.kind !== 'rejected') {
    return null;
  }

  const rejected = props.panel;

  return (
    <>
      <section className="grid grid-cols-[auto_1fr] items-center gap-2">
        <Badge variant="solid-sec-muted">{rejectionLabel(rejected.reason)}</Badge>
        {rejected.participantName != null ? (
          <p className="min-w-0 truncate">{rejected.participantName}</p>
        ) : null}
      </section>
      <p>{rejectionDescription(rejected.reason)}</p>
      <p>
        <small>{props.formatScanned(rejected.scannedAt)}</small>
      </p>
      <section className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={props.handleDismiss}>
          Dismiss
        </Button>
        {props.canUpdateScanning &&
        props.pendingOverride != null &&
        isOverridableRejection(props.pendingOverride.reason) ? (
          <Button
            type="button"
            variant="default"
            onClick={() => {
              props.overrideDialogOpenChange(true);
            }}
          >
            Override
          </Button>
        ) : null}
      </section>
    </>
  );
}

function EligibilityErrorPanel(props: {
  panel: ScanningRuntimePanelState;
  formatScanned: (ts: number) => string;
  handleDismiss: () => void;
}) {
  if (props.panel.kind !== 'eligibility_error') {
    return null;
  }

  const pe = props.panel;

  return (
    <>
      <p>{pe.message}</p>
      <p>
        <small>{props.formatScanned(pe.scannedAt)}</small>
      </p>
      <Button type="button" variant="outline" onClick={props.handleDismiss}>
        Dismiss
      </Button>
    </>
  );
}

export function ScanningRuntimeResultCard(props: Props) {
  const { panel, formatScanned } = props;

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6">
        {panel.kind === 'validating' && panel.showSpinner ? <LoadingSpinner /> : null}
        {panel.kind === 'accepted' ? (
          <AcceptedPanel name={panel.name} scannedAt={panel.scannedAt} formatScanned={formatScanned} />
        ) : null}
        {panel.kind === 'override_ok' ? (
          <OverrideOkPanel name={panel.name} scannedAt={panel.scannedAt} formatScanned={formatScanned} />
        ) : null}
        <RejectedPanel {...props} />
        <EligibilityErrorPanel panel={panel} formatScanned={formatScanned} handleDismiss={props.handleDismiss} />
      </CardContent>
    </Card>
  );
}
