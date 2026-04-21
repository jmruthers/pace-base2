import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';

interface ScanPoint {
  id: string;
  contextType: 'site' | 'activity' | 'transport' | 'meal';
  direction: 'in' | 'out';
  active: boolean;
}

export function ScanningSetupPage() {
  const [scanPoints, setScanPoints] = useState<ReadonlyArray<ScanPoint>>([
    { id: 'scan-point-1', contextType: 'site', direction: 'in', active: true },
  ]);
  const [draftContextType, setDraftContextType] = useState<ScanPoint['contextType']>('site');
  const [statusMessage, setStatusMessage] = useState('');

  const handleCreate = () => {
    setScanPoints((previous) => [
      ...previous,
      {
        id: `scan-point-${previous.length + 1}`,
        contextType: draftContextType,
        direction: 'in',
        active: true,
      },
    ]);
    setStatusMessage('Scan point created.');
  };

  const handleDeactivate = (scanPointId: string) => {
    setScanPoints((previous) =>
      previous.map((scanPoint) =>
        scanPoint.id === scanPointId ? { ...scanPoint, active: false } : scanPoint
      )
    );
    setStatusMessage('Scan point deactivated.');
  };

  const handleManifestDownload = (scanPointId: string) => {
    setStatusMessage(`Manifest generated for ${scanPointId}.`);
  };

  return (
    <PagePermissionGuard pageName="scanning" operation="read" fallback={<AccessDenied />}>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Scanning setup</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="scan-context-type">
              Context type
              <Input
                id="scan-context-type"
                value={draftContextType}
                onChange={(nextValue) => setDraftContextType(String(nextValue) as ScanPoint['contextType'])}
              />
            </Label>
            <Button onClick={handleCreate}>Create scan point</Button>
            <ul>
              {scanPoints.map((scanPoint) => (
                <li key={scanPoint.id}>
                  <p>{scanPoint.id}</p>
                  <p>Context: {scanPoint.contextType}</p>
                  <p>Direction: {scanPoint.direction}</p>
                  <p>Status: {scanPoint.active ? 'active' : 'inactive'}</p>
                  <Button onClick={() => handleDeactivate(scanPoint.id)}>Deactivate</Button>
                  <Button onClick={() => handleManifestDownload(scanPoint.id)}>Download manifest</Button>
                </li>
              ))}
            </ul>
            {statusMessage.length > 0 && <p>{statusMessage}</p>}
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
