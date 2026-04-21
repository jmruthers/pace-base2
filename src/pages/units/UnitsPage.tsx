import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';

interface UnitRecord {
  id: string;
  name: string;
  roleType: string;
}

export function UnitsPage() {
  const [units, setUnits] = useState<ReadonlyArray<UnitRecord>>([
    { id: 'unit-1', name: 'Red Unit', roleType: 'Leader' },
  ]);
  const [draftName, setDraftName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleCreate = () => {
    if (draftName.trim().length === 0) {
      setStatusMessage('Enter a unit name before create.');
      return;
    }
    setUnits((previous) => [
      ...previous,
      {
        id: `unit-${previous.length + 1}`,
        name: draftName.trim(),
        roleType: 'Coordinator',
      },
    ]);
    setDraftName('');
    setStatusMessage('Unit created.');
  };

  const handleDelete = (unitId: string) => {
    setUnits((previous) => previous.filter((unit) => unit.id !== unitId));
    setStatusMessage('Unit removed.');
  };

  return (
    <PagePermissionGuard pageName="units" operation="read" fallback={<AccessDenied />}>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Units</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="unit-name">
              Unit name
              <Input
                id="unit-name"
                value={draftName}
                onChange={(nextValue) => setDraftName(String(nextValue))}
              />
            </Label>
            <Button onClick={handleCreate}>Create unit</Button>
            <ul>
              {units.map((unit) => (
                <li key={unit.id}>
                  <p>{unit.name}</p>
                  <p>Role type: {unit.roleType}</p>
                  <Button onClick={() => handleDelete(unit.id)}>Delete unit</Button>
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
