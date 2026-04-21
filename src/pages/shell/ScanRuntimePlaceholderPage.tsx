import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';

type RuntimeResultCode =
  | 'accepted'
  | 'rejected_card_not_recognised'
  | 'rejected_card_not_valid'
  | 'rejected_registration_not_valid'
  | 'rejected_booking_not_valid'
  | 'rejected_duplicate_scan';

function canOverride(resultCode: RuntimeResultCode): boolean {
  return (
    resultCode === 'rejected_card_not_valid' ||
    resultCode === 'rejected_registration_not_valid' ||
    resultCode === 'rejected_booking_not_valid'
  );
}

function classifyScanInput(scanInput: string): RuntimeResultCode {
  if (scanInput.startsWith('unknown')) {
    return 'rejected_card_not_recognised';
  }
  if (scanInput.startsWith('inactive')) {
    return 'rejected_card_not_valid';
  }
  if (scanInput.startsWith('reg')) {
    return 'rejected_registration_not_valid';
  }
  if (scanInput.startsWith('book')) {
    return 'rejected_booking_not_valid';
  }
  if (scanInput.startsWith('dup')) {
    return 'rejected_duplicate_scan';
  }
  return 'accepted';
}

export function ScanRuntimePlaceholderPage() {
  const { scanPointId } = useParams<{ scanPointId: string }>();
  const [scanValue, setScanValue] = useState('');
  const [runtimeResult, setRuntimeResult] = useState<RuntimeResultCode | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const handleScan = () => {
    const resultCode = classifyScanInput(scanValue.trim());
    setRuntimeResult(resultCode);
    setStatusMessage(`Scan result: ${resultCode}`);
  };

  const handleManualScan = () => {
    setRuntimeResult('accepted');
    setStatusMessage('Manual scan accepted with operator attribution.');
  };

  const handleOverride = () => {
    if (runtimeResult == null || !canOverride(runtimeResult)) {
      setStatusMessage('Override unavailable for this scan outcome.');
      return;
    }
    setStatusMessage('Override accepted.');
  };

  return (
    <PagePermissionGuard pageName="scanning-runtime" operation="read" fallback={<AccessDenied />}>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Scan runtime surface</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              This operator route is intentionally outside the authenticated admin shell.
            </p>
            <p>Scan point: {scanPointId ?? 'unknown'}</p>
            <Label htmlFor="runtime-scan-input">
              Scan input
              <Input
                id="runtime-scan-input"
                value={scanValue}
                onChange={(nextValue) => setScanValue(String(nextValue))}
              />
            </Label>
            <Button onClick={handleScan}>Submit scan</Button>
            <Button onClick={handleManualScan}>Manual scan</Button>
            <Button onClick={handleOverride}>Override</Button>
            {runtimeResult != null && <p>Runtime code: {runtimeResult}</p>}
            {statusMessage.length > 0 && <p>{statusMessage}</p>}
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
