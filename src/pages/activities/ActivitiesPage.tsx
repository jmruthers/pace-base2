import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';

interface ActivityOffering {
  id: string;
  name: string;
  bookingWindowOpen: string;
  bookingWindowClose: string;
}

export function ActivitiesPage() {
  const [offerings, setOfferings] = useState<ReadonlyArray<ActivityOffering>>([
    {
      id: 'offering-1',
      name: 'Climbing',
      bookingWindowOpen: '2026-05-01',
      bookingWindowClose: '2026-05-20',
    },
  ]);
  const [draftName, setDraftName] = useState('');

  const handleCreateOffering = () => {
    if (draftName.trim().length === 0) {
      return;
    }
    setOfferings((previous) => [
      ...previous,
      {
        id: `offering-${previous.length + 1}`,
        name: draftName.trim(),
        bookingWindowOpen: '2026-05-01',
        bookingWindowClose: '2026-05-20',
      },
    ]);
    setDraftName('');
  };

  return (
    <PagePermissionGuard pageName="activities" operation="read" fallback={<AccessDenied />}>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="activity-name">
              Offering name
              <Input
                id="activity-name"
                value={draftName}
                onChange={(nextValue) => setDraftName(String(nextValue))}
              />
            </Label>
            <Button onClick={handleCreateOffering}>Create offering</Button>
            <ul>
              {offerings.map((offering) => (
                <li key={offering.id}>
                  <p>{offering.name}</p>
                  <p>
                    Booking window: {offering.bookingWindowOpen} {'->'} {offering.bookingWindowClose}
                  </p>
                  <p>
                    <Link to={`/activities/${offering.id}`}>Open offering setup</Link>
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
