import { useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';

interface PreferenceRecord {
  sessionId: string;
  rank: number;
}

function isUniqueContiguousRanking(values: ReadonlyArray<number>): boolean {
  const unique = new Set(values);
  if (unique.size !== values.length || values.length === 0) {
    return false;
  }
  const sorted = [...values].sort((left, right) => left - right);
  return sorted.every((value, index) => value === index + 1);
}

export function UnitPreferencesPage() {
  const [preferences, setPreferences] = useState<ReadonlyArray<PreferenceRecord>>([
    { sessionId: 'session-a', rank: 1 },
    { sessionId: 'session-b', rank: 2 },
  ]);
  const [submitted, setSubmitted] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const ranks = useMemo(() => preferences.map((preference) => preference.rank), [preferences]);
  const rankingValid = isUniqueContiguousRanking(ranks);

  const handleRankChange = (sessionId: string, nextValue: string) => {
    if (submitted) {
      return;
    }
    const parsedRank = Number(nextValue);
    setPreferences((previous) =>
      previous.map((preference) =>
        preference.sessionId === sessionId ? { ...preference, rank: parsedRank } : preference
      )
    );
  };

  const handleSubmit = () => {
    if (!rankingValid) {
      setStatusMessage('Rankings must be unique and contiguous from 1..N.');
      return;
    }
    setSubmitted(true);
    setStatusMessage('Preference set submitted and locked.');
  };

  return (
    <PagePermissionGuard pageName="unit-preferences" operation="read" fallback={<AccessDenied />}>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Unit preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <ul>
              {preferences.map((preference) => (
                <li key={preference.sessionId}>
                  <p>{preference.sessionId}</p>
                  <Label htmlFor={`rank-${preference.sessionId}`}>
                    Rank
                    <Input
                      id={`rank-${preference.sessionId}`}
                      type="number"
                      value={String(preference.rank)}
                      onChange={(nextValue) =>
                        handleRankChange(preference.sessionId, String(nextValue))
                      }
                      disabled={submitted}
                    />
                  </Label>
                </li>
              ))}
            </ul>
            <Button onClick={handleSubmit} disabled={submitted}>
              Submit preferences
            </Button>
            {statusMessage.length > 0 && <p>{statusMessage}</p>}
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
