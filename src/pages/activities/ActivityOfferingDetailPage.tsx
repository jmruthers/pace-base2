import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';

function isValidSession(startTime: string, endTime: string, capacity: number): boolean {
  if (capacity <= 0) {
    return false;
  }
  if (startTime.length === 0 || endTime.length === 0) {
    return false;
  }
  return startTime < endTime;
}

export function ActivityOfferingDetailPage() {
  const { offeringId } = useParams();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [capacity, setCapacity] = useState('12');
  const [statusMessage, setStatusMessage] = useState('');

  const numericCapacity = useMemo(() => Number(capacity), [capacity]);

  const handleSaveSession = () => {
    if (!isValidSession(startTime, endTime, numericCapacity)) {
      setStatusMessage('Session validation failed. Check time and capacity values.');
      return;
    }
    setStatusMessage('Session setup saved.');
  };

  return (
    <PagePermissionGuard pageName="activities" operation="read" fallback={<AccessDenied />}>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Activity offering setup</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Offering ID: {offeringId ?? 'unknown'}</p>
            <Label htmlFor="session-start-time">
              Session start time
              <Input
                id="session-start-time"
                value={startTime}
                onChange={(nextValue) => setStartTime(String(nextValue))}
              />
            </Label>
            <Label htmlFor="session-end-time">
              Session end time
              <Input
                id="session-end-time"
                value={endTime}
                onChange={(nextValue) => setEndTime(String(nextValue))}
              />
            </Label>
            <Label htmlFor="session-capacity">
              Session capacity
              <Input
                id="session-capacity"
                type="number"
                value={capacity}
                onChange={(nextValue) => setCapacity(String(nextValue))}
              />
            </Label>
            <Button onClick={handleSaveSession}>Save session setup</Button>
            {statusMessage.length > 0 && <p>{statusMessage}</p>}
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
